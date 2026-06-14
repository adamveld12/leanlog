import {
  createContext,
  use,
  useCallback,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { useAuth } from '@clerk/clerk-react';
import type {
  DailyMealLog,
  Meal,
  UserProfile,
  CreateDailyMealLog,
  UpdateProfile,
  UpsertIngredient,
  DayTargets,
  NutritionDatabaseIngredient,
  NutritionDatabaseIngredientSearchResult,
  CreateNutritionDatabaseIngredient,
  AddIngredientFromDatabase,
  MealTemplate,
  UpsertTemplateIngredient,
} from '@leanlog/data-access';
import { api, ApiError } from './api';

export type EnsureDayResult =
  | { status: 'found'; day: DailyMealLog }
  | { status: 'not_found' }
  | { status: 'error'; error: string };

type Store = {
  days: DailyMealLog[];
  templates: MealTemplate[];
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  ensureDayLoaded(dayId: string): Promise<EnsureDayResult>;
  addDay(
    date: string,
    opts: Omit<CreateDailyMealLog, 'date' | 'mealCountTarget'>,
  ): Promise<DailyMealLog>;
  removeDay(dayId: string): Promise<void>;
  addMeal(dayId: string, name: string): Promise<Meal | null>;
  removeMeal(dayId: string, mealId: string): Promise<void>;
  renameMeal(dayId: string, mealId: string, name: string): Promise<void>;
  logMeal(dayId: string, mealId: string): Promise<void>;
  upsertIngredient(dayId: string, mealId: string, ingredient: UpsertIngredient): Promise<void>;
  removeIngredient(dayId: string, mealId: string, ingredientId: string): Promise<void>;
  addTemplate(name: string): Promise<MealTemplate>;
  renameTemplate(templateId: string, name: string): Promise<void>;
  removeTemplate(templateId: string): Promise<void>;
  reorderTemplates(orderedIds: string[]): Promise<void>;
  upsertTemplateIngredient(templateId: string, ingredient: UpsertTemplateIngredient): Promise<void>;
  removeTemplateIngredient(templateId: string, ingredientId: string): Promise<void>;
  addTemplateIngredientFromDatabase(
    templateId: string,
    input: AddIngredientFromDatabase,
  ): Promise<void>;
  addIngredientFromDatabase(
    dayId: string,
    mealId: string,
    input: AddIngredientFromDatabase,
  ): Promise<void>;
  searchNutritionDatabase(
    query: string,
  ): Promise<{ results: NutritionDatabaseIngredientSearchResult[]; total: number }>;
  createNutritionDatabaseIngredient(
    input: CreateNutritionDatabaseIngredient,
  ): Promise<NutritionDatabaseIngredient>;
  updateDayTargets(dayId: string, targets: DayTargets): Promise<void>;
  updateDayWeight(dayId: string, weightLbs: number): Promise<void>;
  patchProfileLocal(data: Partial<UserProfile>): void;
  updateProfile(data: UpdateProfile): Promise<void>;
};

const Ctx = createContext<Store | null>(null);

// Size/useState-count cleanup (split + useReducer) is deferred to #50.
// react-doctor-disable-next-line react-doctor/no-giant-component, react-doctor/prefer-useReducer
export function StateProvider({ children }: PropsWithChildren) {
  const { getToken, isSignedIn } = useAuth();
  const [days, setDays] = useState<DailyMealLog[]>([]);
  const [templates, setTemplates] = useState<MealTemplate[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const daysRef = useRef(days);

  useEffect(() => {
    daysRef.current = days;
  }, [days]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!isSignedIn) {
        if (!cancelled) setLoading(false);
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
        if (!cancelled) {
          setDays((prev) => {
            const loadedIds = new Set(d.map((day) => day.id));
            return [...d, ...prev.filter((day) => !loadedIds.has(day.id))];
          });
          setProfile(p);
          setTemplates(t);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isSignedIn, getToken]);

  async function withToken<T>(fn: (token: string) => Promise<T>): Promise<T> {
    const token = await getToken();
    if (!token) throw new Error('Not authenticated');
    return fn(token);
  }

  const ensureDayLoaded = useCallback(
    async (dayId: string): Promise<EnsureDayResult> => {
      const existing = daysRef.current.find((day) => day.id === dayId);
      if (existing) return { status: 'found', day: existing };

      try {
        const token = await getToken();
        if (!token) throw new Error('Not authenticated');
        const day = await api.days.get(token, dayId);
        setDays((prev) => {
          const found = prev.some((d) => d.id === day.id);
          return found ? prev.map((d) => (d.id === day.id ? day : d)) : [day, ...prev];
        });
        return { status: 'found', day };
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return { status: 'not_found' };
        const message = error instanceof Error ? error.message : 'Failed to load day';
        return { status: 'error', error: message };
      }
    },
    [getToken],
  );

  const store: Store = {
    days,
    templates,
    profile,
    loading,
    error,
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
      setDays((prev) => [day, ...prev]);
      return day;
    },

    async removeDay(dayId) {
      await withToken((t) => api.days.delete(t, dayId));
      setDays((prev) => prev.filter((d) => d.id !== dayId));
    },

    async addMeal(dayId, name) {
      const meal = await withToken((t) => api.meals.create(t, dayId, name));
      setDays((prev) =>
        prev.map((d) => (d.id === dayId ? { ...d, meals: [...d.meals, meal] } : d)),
      );
      return meal;
    },

    async removeMeal(dayId, mealId) {
      await withToken((t) => api.meals.delete(t, dayId, mealId));
      setDays((prev) =>
        prev.map((d) =>
          d.id === dayId ? { ...d, meals: d.meals.filter((m) => m.id !== mealId) } : d,
        ),
      );
    },

    async renameMeal(dayId, mealId, name) {
      const updated = await withToken((t) => api.meals.rename(t, dayId, mealId, name));
      setDays((prev) =>
        prev.map((d) =>
          d.id === dayId
            ? {
                ...d,
                meals: d.meals.map((m) => (m.id === mealId ? { ...m, name: updated.name } : m)),
              }
            : d,
        ),
      );
    },

    async logMeal(dayId, mealId) {
      const updated = await withToken((t) => api.meals.setLogged(t, dayId, mealId, true));
      setDays((prev) =>
        prev.map((d) =>
          d.id === dayId
            ? { ...d, meals: d.meals.map((m) => (m.id === mealId ? { ...m, ...updated } : m)) }
            : d,
        ),
      );
    },

    async upsertIngredient(dayId, mealId, ingredient) {
      const updated = await withToken((t) => api.ingredients.upsert(t, dayId, mealId, ingredient));
      setDays((prev) =>
        prev.map((d) =>
          d.id === dayId
            ? {
                ...d,
                meals: d.meals.map((m) =>
                  m.id === mealId
                    ? {
                        ...m,
                        // Editing an ingredient auto-logs a copied meal (R30).
                        logged: m.origin === 'template' ? true : m.logged,
                        ingredients: m.ingredients.some((i) => i.id === ingredient.id)
                          ? m.ingredients.map((i) => (i.id === ingredient.id ? updated : i))
                          : [...m.ingredients, updated],
                      }
                    : m,
                ),
              }
            : d,
        ),
      );
    },

    async removeIngredient(dayId, mealId, ingredientId) {
      await withToken((t) => api.ingredients.delete(t, dayId, mealId, ingredientId));
      setDays((prev) =>
        prev.map((d) =>
          d.id === dayId
            ? {
                ...d,
                meals: d.meals.map((m) => {
                  if (m.id !== mealId) return m;
                  const ingredients = m.ingredients.filter((i) => i.id !== ingredientId);
                  return {
                    ...m,
                    // Removing the last ingredient returns a copied meal to
                    // unlogged (R31).
                    logged: m.origin === 'template' && ingredients.length === 0 ? false : m.logged,
                    ingredients,
                  };
                }),
              }
            : d,
        ),
      );
    },

    async addIngredientFromDatabase(dayId, mealId, input) {
      const ingredient = await withToken((t) =>
        api.ingredients.addFromDatabase(t, dayId, mealId, input),
      );
      setDays((prev) =>
        prev.map((d) =>
          d.id === dayId
            ? {
                ...d,
                meals: d.meals.map((m) =>
                  m.id === mealId
                    ? {
                        ...m,
                        // Adding an ingredient (incl. from the database) auto-logs
                        // a copied meal, mirroring the server (R30).
                        logged: m.origin === 'template' ? true : m.logged,
                        ingredients: m.ingredients.some((i) => i.id === ingredient.id)
                          ? m.ingredients.map((i) => (i.id === ingredient.id ? ingredient : i))
                          : [...m.ingredients, ingredient],
                      }
                    : m,
                ),
              }
            : d,
        ),
      );
    },

    async searchNutritionDatabase(query) {
      return withToken((t) => api.nutritionDatabase.search(t, query));
    },

    async createNutritionDatabaseIngredient(input) {
      return withToken((t) => api.nutritionDatabase.create(t, input));
    },

    async updateDayTargets(dayId, targets) {
      const updated = await withToken((t) => api.days.updateTargets(t, dayId, targets));
      setDays((prev) => prev.map((d) => (d.id === dayId ? updated : d)));
    },

    async updateDayWeight(dayId, weightLbs) {
      const updated = await withToken((t) => api.days.updateTargets(t, dayId, { weightLbs }));
      setDays((prev) => prev.map((d) => (d.id === dayId ? updated : d)));
      // Server only updates profile.weightLbs when this is the most recent weight-logged
      // day. Refetch profile to reflect (or skip) that change rather than guessing locally.
      const refreshed = await withToken((t) => api.profile.get(t));
      setProfile(refreshed);
    },

    async addTemplate(name) {
      const template = await withToken((t) => api.mealTemplates.create(t, { name }));
      setTemplates((prev) => [...prev, template]);
      return template;
    },

    async renameTemplate(templateId, name) {
      const updated = await withToken((t) => api.mealTemplates.rename(t, templateId, name));
      setTemplates((prev) => prev.map((tpl) => (tpl.id === templateId ? updated : tpl)));
    },

    async removeTemplate(templateId) {
      await withToken((t) => api.mealTemplates.delete(t, templateId));
      setTemplates((prev) => prev.filter((tpl) => tpl.id !== templateId));
    },

    async reorderTemplates(orderedIds) {
      // Optimistically reorder locally, then reconcile with the server result.
      setTemplates((prev) => {
        const byId = new Map(prev.map((tpl) => [tpl.id, tpl]));
        const reordered = orderedIds
          .map((id) => byId.get(id))
          .filter((tpl): tpl is MealTemplate => tpl != null);
        return reordered.length === prev.length ? reordered : prev;
      });
      const { templates: updated } = await withToken((t) =>
        api.mealTemplates.reorder(t, orderedIds),
      );
      setTemplates(updated);
    },

    async upsertTemplateIngredient(templateId, ingredient) {
      const updated = await withToken((t) =>
        api.mealTemplates.upsertIngredient(t, templateId, ingredient),
      );
      setTemplates((prev) =>
        prev.map((tpl) =>
          tpl.id === templateId
            ? {
                ...tpl,
                ingredients: tpl.ingredients.some((i) => i.id === ingredient.id)
                  ? tpl.ingredients.map((i) => (i.id === ingredient.id ? updated : i))
                  : [...tpl.ingredients, updated],
              }
            : tpl,
        ),
      );
    },

    async removeTemplateIngredient(templateId, ingredientId) {
      await withToken((t) => api.mealTemplates.deleteIngredient(t, templateId, ingredientId));
      setTemplates((prev) =>
        prev.map((tpl) =>
          tpl.id === templateId
            ? { ...tpl, ingredients: tpl.ingredients.filter((i) => i.id !== ingredientId) }
            : tpl,
        ),
      );
    },

    async addTemplateIngredientFromDatabase(templateId, input) {
      const created = await withToken((t) =>
        api.mealTemplates.addIngredientFromDatabase(t, templateId, input),
      );
      setTemplates((prev) =>
        prev.map((tpl) =>
          tpl.id === templateId
            ? {
                ...tpl,
                ingredients: tpl.ingredients.some((i) => i.id === created.id)
                  ? tpl.ingredients.map((i) => (i.id === created.id ? created : i))
                  : [...tpl.ingredients, created],
              }
            : tpl,
        ),
      );
    },

    patchProfileLocal(data) {
      setProfile((prev) => (prev ? { ...prev, ...data } : prev));
    },

    async updateProfile(data) {
      const updated = await withToken((t) => api.profile.update(t, data));
      setProfile(updated);
    },
  };

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const ctx = use(Ctx);
  if (!ctx) throw new Error('useStore must be used within StateProvider');
  return ctx;
}
