import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { useAuth } from '@clerk/clerk-react';
import type {
  DailyMealLog,
  Meal,
  UserProfile,
  CreateDailyMealLog,
  UpdateProfile,
  UpsertIngredient,
  DayTargets,
} from '@leanlog/data-access';
import { api } from './api';

type Store = {
  days: DailyMealLog[];
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  addDay(
    date: string,
    opts: Omit<CreateDailyMealLog, 'date'> & { mealCountTarget: number },
  ): Promise<void>;
  removeDay(dayId: string): Promise<void>;
  addMeal(dayId: string, name: string): Promise<Meal | null>;
  removeMeal(dayId: string, mealId: string): Promise<void>;
  renameMeal(dayId: string, mealId: string, name: string): Promise<void>;
  upsertIngredient(dayId: string, mealId: string, ingredient: UpsertIngredient): Promise<void>;
  removeIngredient(dayId: string, mealId: string, ingredientId: string): Promise<void>;
  updateDayTargets(dayId: string, targets: DayTargets): Promise<void>;
  updateProfile(data: UpdateProfile): Promise<void>;
};

const Ctx = createContext<Store | null>(null);

export function StateProvider({ children }: PropsWithChildren) {
  const { getToken, isSignedIn } = useAuth();
  const [days, setDays] = useState<DailyMealLog[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        const [{ days: d }, p] = await Promise.all([api.days.list(token), api.profile.get(token)]);
        if (!cancelled) {
          setDays(d);
          setProfile(p);
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

  const store: Store = {
    days,
    profile,
    loading,
    error,

    async addDay(date, { targetCalories, targetFat, targetCarbs, targetProtein, mealCountTarget }) {
      const day = await withToken((t) =>
        api.days.create(t, {
          date,
          targetCalories,
          targetFat,
          targetCarbs,
          targetProtein,
          mealCountTarget,
        }),
      );
      setDays((prev) => [day, ...prev]);
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
                meals: d.meals.map((m) =>
                  m.id === mealId
                    ? { ...m, ingredients: m.ingredients.filter((i) => i.id !== ingredientId) }
                    : m,
                ),
              }
            : d,
        ),
      );
    },

    async updateDayTargets(dayId, targets) {
      const updated = await withToken((t) => api.days.updateTargets(t, dayId, targets));
      setDays((prev) => prev.map((d) => (d.id === dayId ? updated : d)));
    },

    async updateProfile(data) {
      const updated = await withToken((t) => api.profile.update(t, data));
      setProfile(updated);
    },
  };

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useStore must be used within StateProvider');
  return ctx;
}
