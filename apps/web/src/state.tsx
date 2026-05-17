import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type PropsWithChildren,
  type SetStateAction,
} from 'react';
import { v4 as uuid } from 'uuid';
import { ingredientDedupeKey, normalizeIngredientName, todayIso } from './lib';
import type { AppState, Day, Ingredient, LibraryIngredient, Meal } from './types';

const KEY = 'mealTracker.v1';

const initial: AppState = {
  version: 1,
  settings: {
    calorieTarget: 2000,
    mealCountTarget: 3,
    macroTargets: { fat: 70, saturatedFat: 20, carbs: 250, fiber: 30, protein: 140 },
    theme: 'system',
  },
  days: [{ id: uuid(), date: todayIso(), meals: [] }],
  ingredientLibrary: [],
};

type Store = {
  state: AppState;
  setState: Dispatch<SetStateAction<AppState>>;
  addDay: (date: string) => void;
  removeDay: (dayId: string) => void;
  addMeal: (dayId: string, name: string) => Meal | null;
  removeMeal: (dayId: string, mealId: string) => void;
  renameMeal: (dayId: string, mealId: string, name: string) => void;
  upsertIngredient: (dayId: string, mealId: string, ingredient: Ingredient) => void;
  removeIngredient: (dayId: string, mealId: string, ingredientId: string) => void;
  addFromLibrary: (dayId: string, mealId: string, libraryId: string) => void;
  saveIngredientToLibrary: (ingredient: Ingredient, overwriteId?: string) => void;
};

const Ctx = createContext<Store | null>(null);

const parse = (): AppState => {
  const raw = localStorage.getItem(KEY);
  if (!raw) return initial;
  try {
    const parsed = JSON.parse(raw) as AppState;
    return parsed.days.length ? parsed : initial;
  } catch {
    return initial;
  }
};

const touchLibrary = (items: LibraryIngredient[], id: string) =>
  items.map((i) => (i.id === id ? { ...i, lastUsedAt: new Date().toISOString() } : i));

export function StateProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<AppState>(parse);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(state));
    const theme = state.settings.theme;
    const root = document.documentElement;
    root.dataset.theme = theme;
  }, [state]);

  const store = useMemo<Store>(
    () => ({
      state,
      setState,
      addDay: (date) =>
        setState((s) =>
          s.days.some((d) => d.date === date)
            ? s
            : { ...s, days: [{ id: uuid(), date, meals: [] }, ...s.days] },
        ),
      removeDay: (dayId) => setState((s) => ({ ...s, days: s.days.filter((d) => d.id !== dayId) })),
      addMeal: (dayId, name) => {
        const meal: Meal = { id: uuid(), name: name.trim(), ingredients: [] };
        setState((s) => ({
          ...s,
          days: s.days.map((d) => (d.id === dayId ? { ...d, meals: [...d.meals, meal] } : d)),
        }));
        return meal;
      },
      removeMeal: (dayId, mealId) =>
        setState((s) => ({
          ...s,
          days: s.days.map((d) =>
            d.id === dayId ? { ...d, meals: d.meals.filter((m) => m.id !== mealId) } : d,
          ),
        })),
      renameMeal: (dayId, mealId, name) =>
        setState((s) => ({
          ...s,
          days: s.days.map((d: Day) =>
            d.id === dayId
              ? { ...d, meals: d.meals.map((m) => (m.id === mealId ? { ...m, name } : m)) }
              : d,
          ),
        })),
      upsertIngredient: (dayId, mealId, ingredient) =>
        setState((s) => ({
          ...s,
          days: s.days.map((d) =>
            d.id === dayId
              ? {
                  ...d,
                  meals: d.meals.map((m) =>
                    m.id === mealId
                      ? {
                          ...m,
                          ingredients: m.ingredients.some((i) => i.id === ingredient.id)
                            ? m.ingredients.map((i) => (i.id === ingredient.id ? ingredient : i))
                            : [...m.ingredients, ingredient],
                        }
                      : m,
                  ),
                }
              : d,
          ),
        })),
      removeIngredient: (dayId, mealId, ingredientId) =>
        setState((s) => ({
          ...s,
          days: s.days.map((d) =>
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
        })),
      addFromLibrary: (dayId, mealId, libraryId) => {
        const base = state.ingredientLibrary.find((i) => i.id === libraryId);
        if (!base) return;
        const ingredient: Ingredient = { ...base, id: uuid(), libraryId: base.id };
        setState((s) => ({
          ...s,
          ingredientLibrary: touchLibrary(s.ingredientLibrary, libraryId),
          days: s.days.map((d) =>
            d.id === dayId
              ? {
                  ...d,
                  meals: d.meals.map((m) =>
                    m.id === mealId ? { ...m, ingredients: [...m.ingredients, ingredient] } : m,
                  ),
                }
              : d,
          ),
        }));
      },
      saveIngredientToLibrary: (ingredient, overwriteId) => {
        const normalizedName = normalizeIngredientName(ingredient.name);
        const next: LibraryIngredient = {
          ...ingredient,
          id: overwriteId ?? uuid(),
          name: normalizedName,
          lastUsedAt: new Date().toISOString(),
        };
        setState((s) => {
          const match = s.ingredientLibrary.find(
            (i) => ingredientDedupeKey(i.name) === ingredientDedupeKey(next.name),
          );
          if (overwriteId) {
            return {
              ...s,
              ingredientLibrary: s.ingredientLibrary.map((i) => (i.id === overwriteId ? next : i)),
            };
          }
          if (match) return s;
          return { ...s, ingredientLibrary: [next, ...s.ingredientLibrary] };
        });
      },
    }),
    [state],
  );

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('Missing StateProvider');
  return ctx;
}
