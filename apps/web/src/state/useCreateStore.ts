import { useCallback, useEffect, useReducer, useRef } from 'react';
import { useAuth } from '@clerk/clerk-react';
import type { DailyMealLog } from '@leanlog/data-access';
import { api, ApiError } from '../api';
import { initialStoreState, storeReducer } from './storeReducer';
import type { EnsureDayResult, Store } from './types';

export function useCreateStore(): Store {
  const { getToken, isSignedIn } = useAuth();
  const [state, dispatch] = useReducer(storeReducer, initialStoreState);
  const daysRef = useRef<DailyMealLog[]>(state.days);

  useEffect(() => {
    daysRef.current = state.days;
  }, [state.days]);

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
        const [{ days: d }, p, { templates: t }] = await Promise.all([
          api.days.list(token),
          api.profile.get(token),
          api.mealTemplates.list(token),
        ]);
        if (!cancelled) dispatch({ type: 'loaded', days: d, profile: p, templates: t });
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

  return {
    days: state.days,
    templates: state.templates,
    profile: state.profile,
    loading: state.loading,
    error: state.error,
    ensureDayLoaded,

    async addDay(date, { targetCalories, targetFat, targetCarbs, targetProtein }) {
      // mealCountTarget is derived server-side from the copied templates, so the
      // client no longer supplies it (issue #41).
      const day = await withToken((t) =>
        api.days.create(t, {
          date,
          targetCalories,
          targetFat,
          targetCarbs,
          targetProtein,
          mealCountTarget: 0,
        }),
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
      dispatch({ type: 'mealRemoved', dayId, mealId });
    },

    async renameMeal(dayId, mealId, name) {
      const updated = await withToken((t) => api.meals.rename(t, dayId, mealId, name));
      dispatch({ type: 'mealPatched', dayId, mealId, patch: { name: updated.name } });
    },

    async logMeal(dayId, mealId) {
      const updated = await withToken((t) => api.meals.setLogged(t, dayId, mealId, true));
      dispatch({ type: 'mealPatched', dayId, mealId, patch: updated });
    },

    async upsertIngredient(dayId, mealId, ingredient) {
      const updated = await withToken((t) => api.ingredients.upsert(t, dayId, mealId, ingredient));
      dispatch({ type: 'ingredientUpserted', dayId, mealId, ingredient: updated });
    },

    async removeIngredient(dayId, mealId, ingredientId) {
      await withToken((t) => api.ingredients.delete(t, dayId, mealId, ingredientId));
      dispatch({ type: 'ingredientRemoved', dayId, mealId, ingredientId });
    },

    async addIngredientFromDatabase(dayId, mealId, input) {
      const ingredient = await withToken((t) =>
        api.ingredients.addFromDatabase(t, dayId, mealId, input),
      );
      dispatch({ type: 'ingredientUpserted', dayId, mealId, ingredient });
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

    async deleteNutritionDatabaseIngredient(id) {
      await withToken((t) => api.nutritionDatabase.delete(t, id));
    },

    async updateDayTargets(dayId, targets) {
      const updated = await withToken((t) => api.days.updateTargets(t, dayId, targets));
      dispatch({ type: 'dayReplaced', day: updated });
    },

    async updateDayWeight(dayId, weightLbs) {
      const updated = await withToken((t) => api.days.updateTargets(t, dayId, { weightLbs }));
      dispatch({ type: 'dayReplaced', day: updated });
      // Server only updates profile.weightLbs when this is the most recent weight-logged
      // day. Refetch profile to reflect (or skip) that change rather than guessing locally.
      const refreshed = await withToken((t) => api.profile.get(t));
      dispatch({ type: 'profileSet', profile: refreshed });
    },

    async addTemplate(name) {
      const template = await withToken((t) => api.mealTemplates.create(t, { name }));
      dispatch({ type: 'templateAdded', template });
      return template;
    },

    async renameTemplate(templateId, name) {
      const updated = await withToken((t) => api.mealTemplates.rename(t, templateId, name));
      dispatch({ type: 'templateReplaced', template: updated });
    },

    async removeTemplate(templateId) {
      await withToken((t) => api.mealTemplates.delete(t, templateId));
      dispatch({ type: 'templateRemoved', templateId });
    },

    async reorderTemplates(orderedIds) {
      // Optimistically reorder locally, then reconcile with the server result.
      dispatch({ type: 'templatesReordered', orderedIds });
      const { templates: updated } = await withToken((t) =>
        api.mealTemplates.reorder(t, orderedIds),
      );
      dispatch({ type: 'templatesSet', templates: updated });
    },

    async upsertTemplateIngredient(templateId, ingredient) {
      const updated = await withToken((t) =>
        api.mealTemplates.upsertIngredient(t, templateId, ingredient),
      );
      dispatch({ type: 'templateIngredientUpserted', templateId, ingredient: updated });
    },

    async removeTemplateIngredient(templateId, ingredientId) {
      await withToken((t) => api.mealTemplates.deleteIngredient(t, templateId, ingredientId));
      dispatch({ type: 'templateIngredientRemoved', templateId, ingredientId });
    },

    async addTemplateIngredientFromDatabase(templateId, input) {
      const created = await withToken((t) =>
        api.mealTemplates.addIngredientFromDatabase(t, templateId, input),
      );
      dispatch({ type: 'templateIngredientUpserted', templateId, ingredient: created });
    },

    patchProfileLocal(data) {
      dispatch({ type: 'profilePatched', data });
    },

    async updateProfile(data) {
      const updated = await withToken((t) => api.profile.update(t, data));
      dispatch({ type: 'profileSet', profile: updated });
    },
  };
}
