import { useCallback, useEffect, useReducer, useRef } from 'react';
import { useAuth } from '@clerk/clerk-react';
import posthog from 'posthog-js';
import { useAnalytics } from '@leanlog/ui';
import {
  dayMealStructure,
  dayObjectives,
  deriveDayPlan,
  goalCoversDate,
  isMeaningfulMeal,
  resolveCoveringGoal,
  type DailyMealLog,
  type Goal,
} from '@leanlog/data-access';
import { api, ApiError } from '../api';
import { todayIso } from '../lib';
import { FALLBACK_DAY_TARGETS, selectWeightEntries } from '../selectors';
import { initialStoreState, storeReducer, type StoreAction } from './storeReducer';
import type { EnsureDayResult, EnsurePlanResult, Store } from './types';

type DayTargetsPatch = {
  targetCalories: number;
  targetFat: number;
  targetCarbs: number;
  targetProtein: number;
};

// Targets for a date derived from the covering goal + latest known weight (#56).
function deriveTargetsForDay(
  date: string,
  days: DailyMealLog[],
  goals: Goal[],
): DayTargetsPatch | null {
  const plan = deriveDayPlan(date, goals, selectWeightEntries(days), todayIso());
  if (!plan) return null;
  return {
    targetCalories: plan.targetCalories,
    targetFat: plan.targetFat,
    targetCarbs: plan.targetCarbs,
    targetProtein: plan.targetProtein,
  };
}

export function useCreateStore(): Store {
  const { getToken, isSignedIn } = useAuth();
  const [state, dispatch] = useReducer(storeReducer, initialStoreState);
  const daysRef = useRef<DailyMealLog[]>(state.days);
  const goalsRef = useRef<Goal[]>(state.goals);
  const planDetailsRef = useRef(state.planDetails);
  const track = useAnalytics();
  // Per-session guards for objective analytics (#37 R34): a meal is reported the
  // first time it becomes meaningful even if it later re-crosses the line, and a
  // day's completion is attempted once at a time however many edits trigger it.
  // Created lazily and only read from event handlers, never during render.
  const reportedMealsRef = useRef<Set<string> | null>(null);
  const completionRef = useRef<Set<string> | null>(null);
  const reportedMeals = () => (reportedMealsRef.current ??= new Set());
  const completions = () => (completionRef.current ??= new Set());

  useEffect(() => {
    daysRef.current = state.days;
  }, [state.days]);

  useEffect(() => {
    planDetailsRef.current = state.planDetails;
  }, [state.planDetails]);

  useEffect(() => {
    goalsRef.current = state.goals;
  }, [state.goals]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!isSignedIn) {
        if (!cancelled) dispatch({ type: 'loadingDone' });
        return;
      }
      try {
        const token = await getToken();
        if (!token || cancelled) return;
        const [{ days: d }, p, { plans: pl }, { goals: g }] = await Promise.all([
          api.days.list(token),
          api.profile.get(token),
          api.plans.list(token),
          api.goals.list(token),
        ]);
        if (!cancelled) dispatch({ type: 'loaded', days: d, profile: p, plans: pl, goals: g });
      } catch (e) {
        if (!cancelled) {
          dispatch({
            type: 'loadFailed',
            error: e instanceof Error ? e.message : 'Failed to load data',
          });
        }
      } finally {
        if (!cancelled) dispatch({ type: 'loadingDone' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isSignedIn, getToken]);

  const withToken = useCallback(
    async <T>(fn: (token: string) => Promise<T>): Promise<T> => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      return fn(token);
    },
    [getToken],
  );

  // Asks the server to stamp the day's first all-objectives-complete time. The
  // server re-verifies, so a stale client is simply declined; only a stamp that
  // actually lands is reported. Never throws: a lost stamp must not fail the edit
  // that triggered it, and the next qualifying edit retries.
  async function completeObjectives(day: DailyMealLog) {
    if (completions().has(day.id)) return;
    completions().add(day.id);
    try {
      const updated = await withToken((t) => api.days.completeObjectives(t, day.id));
      if (!updated.objectivesCompletedAt) {
        completions().delete(day.id);
        return;
      }
      // Merge only the stamp so a concurrent local edit isn't overwritten by the
      // server's snapshot.
      const local = daysRef.current.find((d) => d.id === day.id);
      if (local) {
        const merged = { ...local, objectivesCompletedAt: updated.objectivesCompletedAt };
        daysRef.current = daysRef.current.map((d) => (d.id === day.id ? merged : d));
        dispatch({ type: 'dayReplaced', day: merged });
      }
      track('day.objectives.completed', { dayId: day.id, dayDate: day.date });
    } catch (e) {
      completions().delete(day.id);
      posthog.captureException(e, { context: 'day_objectives_complete' });
    }
  }

  // Objective analytics fire on the transition itself, which is why they live
  // here and not in a component: only a mutation sees before → after (#37 R28-R34).
  // Only today is evaluated, so back-filling history never fires them.
  function observeObjectives(before: DailyMealLog, after: DailyMealLog) {
    if (after.date !== todayIso()) return;
    const ctx = { dayId: after.id, dayDate: after.date };

    if (before.weightLbs == null && after.weightLbs != null) {
      track('day.objectives.completed.weight_logged', { ...ctx, value: after.weightLbs });
    }

    // Anything meaningful beforehand counts as already reported, so removing a
    // meal's food and adding it back doesn't report the same meal twice.
    const wasMeaningful = before.meals.filter(isMeaningfulMeal);
    for (const m of wasMeaningful) reportedMeals().add(`${after.id}:${m.id}`);
    const meaningful = after.meals.filter(isMeaningfulMeal);
    const total = dayMealStructure(after).mealsExpected;
    for (const m of meaningful) {
      const key = `${after.id}:${m.id}`;
      if (reportedMeals().has(key)) continue;
      reportedMeals().add(key);
      track('day.objectives.completed.meal_eaten', {
        ...ctx,
        mealId: m.id,
        value: meaningful.length,
        total,
      });
    }

    if (!after.objectivesCompletedAt && dayObjectives(after).allComplete) {
      void completeObjectives(after);
    }
  }

  // Dispatches, then replays the same pure reducer to learn the resulting day
  // synchronously — including server side-effects the reducer mirrors, like a
  // plan meal auto-logging when food is added. React state isn't readable until
  // the next render, so daysRef is advanced here too.
  function commit(dayId: string, ...actions: StoreAction[]) {
    const before = daysRef.current.find((d) => d.id === dayId);
    let next = { ...initialStoreState, days: daysRef.current };
    for (const action of actions) {
      dispatch(action);
      next = storeReducer(next, action);
    }
    daysRef.current = next.days;
    const after = next.days.find((d) => d.id === dayId);
    if (before && after) observeObjectives(before, after);
  }

  const ensureDayLoaded = useCallback(
    async (dayId: string): Promise<EnsureDayResult> => {
      const existing = daysRef.current.find((day) => day.id === dayId);
      if (existing) return { status: 'found', day: existing };

      try {
        const token = await getToken();
        if (!token) throw new Error('Not authenticated');
        const day = await api.days.get(token, dayId);
        dispatch({ type: 'dayUpserted', day });
        return { status: 'found', day };
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return { status: 'not_found' };
        const message = error instanceof Error ? error.message : 'Failed to load day';
        return { status: 'error', error: message };
      }
    },
    [getToken],
  );

  const ensurePlanLoaded = useCallback(
    async (planId: string): Promise<EnsurePlanResult> => {
      const existing = planDetailsRef.current.find((plan) => plan.id === planId);
      if (existing) return { status: 'found', plan: existing };

      try {
        const token = await getToken();
        if (!token) throw new Error('Not authenticated');
        const plan = await api.plans.get(token, planId);
        dispatch({ type: 'planDetailUpserted', plan });
        return { status: 'found', plan };
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return { status: 'not_found' };
        const message = error instanceof Error ? error.message : 'Failed to load plan';
        return { status: 'error', error: message };
      }
    },
    [getToken],
  );

  return {
    days: state.days,
    plans: state.plans,
    planDetails: state.planDetails,
    goals: state.goals,
    profile: state.profile,
    loading: state.loading,
    error: state.error,
    ensureDayLoaded,
    ensurePlanLoaded,

    async addDay(date) {
      // Derive targets + covering goal client-side (#56); the server snapshots the
      // goal's meal slots into the day's meals. mealCountTarget is derived
      // server-side from those slots, so the client sends 0.
      const plan = deriveDayPlan(
        date,
        goalsRef.current,
        selectWeightEntries(daysRef.current),
        todayIso(),
      );
      const targets = plan
        ? {
            targetCalories: plan.targetCalories,
            targetFat: plan.targetFat,
            targetCarbs: plan.targetCarbs,
            targetProtein: plan.targetProtein,
          }
        : FALLBACK_DAY_TARGETS;
      const day = await withToken((t) =>
        api.days.create(t, { date, ...targets, mealCountTarget: 0, goalId: plan?.goalId }),
      );
      dispatch({ type: 'dayAdded', day });
      return day;
    },

    async removeDay(dayId) {
      await withToken((t) => api.days.delete(t, dayId));
      dispatch({ type: 'dayRemoved', dayId });
    },

    async addMeal(dayId, name) {
      const meal = await withToken((t) => api.meals.create(t, dayId, name));
      dispatch({ type: 'mealAdded', dayId, meal });
      return meal;
    },

    async removeMeal(dayId, mealId) {
      await withToken((t) => api.meals.delete(t, dayId, mealId));
      commit(dayId, { type: 'mealRemoved', dayId, mealId });
    },

    async renameMeal(dayId, mealId, name) {
      const updated = await withToken((t) => api.meals.rename(t, dayId, mealId, name));
      dispatch({ type: 'mealPatched', dayId, mealId, patch: { name: updated.name } });
    },

    async logMeal(dayId, mealId) {
      const updated = await withToken((t) => api.meals.setLogged(t, dayId, mealId, true));
      commit(dayId, { type: 'mealPatched', dayId, mealId, patch: updated });
    },

    async upsertIngredient(dayId, mealId, ingredient) {
      const updated = await withToken((t) => api.ingredients.upsert(t, dayId, mealId, ingredient));
      commit(dayId, { type: 'ingredientUpserted', dayId, mealId, ingredient: updated });
    },

    async removeIngredient(dayId, mealId, ingredientId) {
      await withToken((t) => api.ingredients.delete(t, dayId, mealId, ingredientId));
      commit(dayId, { type: 'ingredientRemoved', dayId, mealId, ingredientId });
    },

    async addExtra(dayId, data) {
      const meal = await withToken((t) => api.extras.add(t, dayId, data));
      commit(dayId, { type: 'mealUpserted', dayId, meal });
      return meal;
    },

    async addExtraFromDatabase(dayId, input) {
      // mealUpserted, not ingredientUpserted: the Extras bucket may not exist in
      // local state yet, so the server's full meal creates or replaces it.
      const meal = await withToken((t) => api.extras.addFromDatabase(t, dayId, input));
      commit(dayId, { type: 'mealUpserted', dayId, meal });
      return meal;
    },

    async addIngredientFromDatabase(dayId, mealId, input) {
      const ingredient = await withToken((t) =>
        api.ingredients.addFromDatabase(t, dayId, mealId, input),
      );
      commit(dayId, { type: 'ingredientUpserted', dayId, mealId, ingredient });
    },

    async applyPlanToDay(dayId, planId) {
      // Apply both fills and appends unmatched meals, so a partial local
      // mirror risks drifting from the server; replace the whole day instead.
      const { day, filled, skipped } = await withToken((t) => api.days.applyPlan(t, dayId, planId));
      commit(dayId, { type: 'dayReplaced', day });
      return { filled, skipped };
    },

    async searchNutritionDatabase(query) {
      return withToken((t) => api.nutritionDatabase.search(t, query));
    },

    async browseNutritionDatabase(opts) {
      return withToken((t) => api.nutritionDatabase.list(t, opts));
    },

    async createNutritionDatabaseIngredient(input) {
      return withToken((t) => api.nutritionDatabase.create(t, input));
    },

    async updateNutritionDatabaseIngredient(id, input) {
      return withToken((t) => api.nutritionDatabase.update(t, id, input));
    },

    async updateNutritionDatabasePhotos(id, patch) {
      return withToken((t) => api.nutritionDatabase.updatePhotos(t, id, patch));
    },

    async deleteNutritionDatabaseIngredient(id) {
      await withToken((t) => api.nutritionDatabase.delete(t, id));
    },

    async updateDayTargets(dayId, targets) {
      const updated = await withToken((t) => api.days.updateTargets(t, dayId, targets));
      commit(dayId, { type: 'dayReplaced', day: updated });
    },

    async updateDayWeight(dayId, weightLbs) {
      const updated = await withToken((t) => api.days.updateTargets(t, dayId, { weightLbs }));
      commit(dayId, { type: 'dayReplaced', day: updated });
      // R62: a successful weight log recomputes that day's targets from its
      // covering goal and the new weight. Use a day list that already reflects the
      // saved weight so weight-on-or-before picks it up.
      const mergedDays = daysRef.current.map((day) => (day.id === updated.id ? updated : day));
      const targets = deriveTargetsForDay(updated.date, mergedDays, goalsRef.current);
      if (targets) {
        const recomputed = await withToken((t) => api.days.updateTargets(t, dayId, targets));
        commit(dayId, { type: 'dayReplaced', day: recomputed });
      }
      // Server only updates profile.weightLbs when this is the most recent weight-logged
      // day. Refetch profile to reflect (or skip) that change rather than guessing locally.
      const refreshed = await withToken((t) => api.profile.get(t));
      dispatch({ type: 'profileSet', profile: refreshed });
    },

    async setDayProgressPhoto(dayId, pose, key) {
      const updated = await withToken((t) =>
        api.progressPhotos.setDayPhoto(t, dayId, { pose, key }),
      );
      dispatch({ type: 'dayReplaced', day: updated });
    },

    async setProgressBaseline(pose, date) {
      const updated = await withToken((t) => api.progressPhotos.setBaseline(t, { pose, date }));
      dispatch({ type: 'profileSet', profile: updated });
    },

    async addPlan(name) {
      const plan = await withToken((t) => api.plans.create(t, { name }));
      dispatch({ type: 'planSummaryAdded', plan });
      dispatch({ type: 'planDetailUpserted', plan });
      return plan;
    },

    async renamePlan(planId, name) {
      const updated = await withToken((t) => api.plans.rename(t, planId, name));
      dispatch({ type: 'planSummaryReplaced', plan: updated });
      dispatch({ type: 'planDetailUpserted', plan: updated });
    },

    async removePlan(planId) {
      await withToken((t) => api.plans.delete(t, planId));
      dispatch({ type: 'planRemoved', planId });
    },

    async duplicatePlan(planId) {
      const plan = await withToken((t) => api.plans.duplicate(t, planId));
      dispatch({ type: 'planSummaryAdded', plan });
      dispatch({ type: 'planDetailUpserted', plan });
      return plan;
    },

    async reorderPlans(orderedIds) {
      // Optimistically reorder locally, then reconcile with the server result.
      dispatch({ type: 'plansReordered', orderedIds });
      const { plans: updated } = await withToken((t) => api.plans.reorder(t, orderedIds));
      dispatch({ type: 'plansSet', plans: updated });
    },

    async addPlanMeal(planId, name) {
      const meal = await withToken((t) => api.plans.addMeal(t, planId, { name }));
      dispatch({ type: 'planMealAdded', planId, meal });
      return meal;
    },

    async renamePlanMeal(planId, mealId, name) {
      await withToken((t) => api.plans.renameMeal(t, planId, mealId, name));
      dispatch({ type: 'planMealRenamed', planId, mealId, name });
    },

    async removePlanMeal(planId, mealId) {
      await withToken((t) => api.plans.removeMeal(t, planId, mealId));
      dispatch({ type: 'planMealRemoved', planId, mealId });
    },

    async reorderPlanMeals(planId, orderedIds) {
      const { meals } = await withToken((t) => api.plans.reorderMeals(t, planId, orderedIds));
      dispatch({ type: 'planMealsReordered', planId, meals });
    },

    async upsertPlanIngredient(planId, mealId, ingredient) {
      const updated = await withToken((t) =>
        api.plans.upsertIngredient(t, planId, mealId, ingredient),
      );
      dispatch({ type: 'planIngredientUpserted', planId, mealId, ingredient: updated });
    },

    async removePlanIngredient(planId, mealId, ingredientId) {
      await withToken((t) => api.plans.deleteIngredient(t, planId, mealId, ingredientId));
      dispatch({ type: 'planIngredientRemoved', planId, mealId, ingredientId });
    },

    async addPlanIngredientFromDatabase(planId, mealId, input) {
      const created = await withToken((t) =>
        api.plans.addIngredientFromDatabase(t, planId, mealId, input),
      );
      dispatch({ type: 'planIngredientUpserted', planId, mealId, ingredient: created });
    },

    patchProfileLocal(data) {
      dispatch({ type: 'profilePatched', data });
    },

    async updateProfile(data) {
      const updated = await withToken((t) => api.profile.update(t, data));
      dispatch({ type: 'profileSet', profile: updated });
    },

    async createGoal(data) {
      const goal = await withToken((t) => api.goals.create(t, data));
      dispatch({ type: 'goalAdded', goal });
      return goal;
    },

    async updateGoal(goalId, data) {
      const updated = await withToken((t) => api.goals.update(t, goalId, data));
      dispatch({ type: 'goalReplaced', goal: updated });
      // R22/R60: recompute the targets of covered days from today forward; past
      // days keep their snapshots. Use a goals list that includes the edited goal.
      const goals = goalsRef.current.map((g) => (g.id === updated.id ? updated : g));
      const today = todayIso();
      const recomputes: { dayId: string; targets: DayTargetsPatch }[] = [];
      for (const day of daysRef.current) {
        if (day.date < today || !goalCoversDate(updated, day.date)) continue;
        const targets = deriveTargetsForDay(day.date, daysRef.current, goals);
        if (targets) recomputes.push({ dayId: day.id, targets });
      }
      const recomputed = await Promise.all(
        recomputes.map(({ dayId, targets }) =>
          withToken((t) => api.days.updateTargets(t, dayId, targets)),
        ),
      );
      for (const day of recomputed) dispatch({ type: 'dayReplaced', day });
      return updated;
    },

    async removeGoal(goalId) {
      await withToken((t) => api.goals.delete(t, goalId));
      dispatch({ type: 'goalRemoved', goalId });
    },

    async configureBackgroundGoal(data) {
      const updated = await withToken((t) => api.goals.updateBackground(t, data));
      dispatch({ type: 'goalReplaced', goal: updated });
      // R23/R24: the background goal supplies fallback/gap-day targets, so changing
      // its basis must recompute every covered day from today forward whose plan
      // resolves to the background goal. Past days keep their snapshots.
      const goals = goalsRef.current.map((g) => (g.id === updated.id ? updated : g));
      const today = todayIso();
      const recomputes: { dayId: string; targets: DayTargetsPatch }[] = [];
      for (const day of daysRef.current) {
        if (day.date < today) continue;
        const covering = resolveCoveringGoal(day.date, goals);
        if (covering?.id !== updated.id) continue;
        const targets = deriveTargetsForDay(day.date, daysRef.current, goals);
        if (targets) recomputes.push({ dayId: day.id, targets });
      }
      const recomputed = await Promise.all(
        recomputes.map(({ dayId, targets }) =>
          withToken((t) => api.days.updateTargets(t, dayId, targets)),
        ),
      );
      for (const day of recomputed) dispatch({ type: 'dayReplaced', day });
      return updated;
    },
  };
}
