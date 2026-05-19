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
import { todayIso } from './lib';
import type { AppState, Day, DayTargets, Ingredient, Meal } from './types';

const KEY = 'mealTracker.v1';

const defaultDayTargets: DayTargets = {
  calories: 2700,
  macros: { fat: 75, carbs: 236, protein: 270 },
};

const initial: AppState = {
  version: 1,
  settings: {
    calorieTarget: 2000,
    mealCountTarget: 3,
    macroTargets: { fat: 70, saturatedFat: 20, carbs: 250, fiber: 30, protein: 140 },
    theme: 'system',
  },
  days: [
    { id: uuid(), date: todayIso(), meals: [], targets: defaultDayTargets, mealCountTarget: 3 },
  ],
};

type Store = {
  state: AppState;
  setState: Dispatch<SetStateAction<AppState>>;
  addDay: (date: string, targets: DayTargets, mealCountTarget: number) => void;
  removeDay: (dayId: string) => void;
  addMeal: (dayId: string, name: string) => Meal | null;
  removeMeal: (dayId: string, mealId: string) => void;
  renameMeal: (dayId: string, mealId: string, name: string) => void;
  upsertIngredient: (dayId: string, mealId: string, ingredient: Ingredient) => void;
  removeIngredient: (dayId: string, mealId: string, ingredientId: string) => void;
};

const Ctx = createContext<Store | null>(null);

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object';

const migrateIngredient = (raw: unknown): Ingredient => {
  if (!isRecord(raw)) throw new Error('Invalid state schema. Import failed.');
  const weight =
    typeof raw.weight === 'number' ? raw.weight : typeof raw.grams === 'number' ? raw.grams : 0;

  return {
    id: String(raw.id ?? ''),
    name: String(raw.name ?? ''),
    weight,
    calories: Number(raw.calories ?? 0),
    fat: Number(raw.fat ?? 0),
    saturatedFat: Number(raw.saturatedFat ?? 0),
    carbs: Number(raw.carbs ?? 0),
    fiber: Number(raw.fiber ?? 0),
    protein: Number(raw.protein ?? 0),
  };
};

export const migrateState = (raw: unknown): AppState => {
  if (!isRecord(raw) || raw.version !== 1 || !Array.isArray(raw.days) || !isRecord(raw.settings)) {
    throw new Error('Invalid state schema. Import failed.');
  }

  return {
    version: 1,
    settings: raw.settings as AppState['settings'],
    days: raw.days.map((day) => {
      if (!isRecord(day) || !Array.isArray(day.meals)) {
        throw new Error('Invalid state schema. Import failed.');
      }
      if (!isRecord(day.targets) || !isRecord(day.targets.macros)) {
        throw new Error('Invalid state schema. Import failed.');
      }
      return {
        id: String(day.id ?? ''),
        date: String(day.date ?? ''),
        targets: {
          calories: Number(day.targets.calories ?? 0),
          macros: {
            fat: Number(day.targets.macros.fat ?? 0),
            carbs: Number(day.targets.macros.carbs ?? 0),
            protein: Number(day.targets.macros.protein ?? 0),
          },
        },
        mealCountTarget: Number(
          day.mealCountTarget ?? (raw.settings as AppState['settings']).mealCountTarget ?? 3,
        ),
        meals: day.meals.map((meal) => {
          if (!isRecord(meal) || !Array.isArray(meal.ingredients)) {
            throw new Error('Invalid state schema. Import failed.');
          }
          return {
            id: String(meal.id ?? ''),
            name: String(meal.name ?? ''),
            ingredients: meal.ingredients.map(migrateIngredient),
          };
        }),
      };
    }),
  };
};

const parse = (): AppState => {
  const raw = localStorage.getItem(KEY);
  if (!raw) return initial;
  try {
    const parsed = migrateState(JSON.parse(raw));
    return parsed.days.length ? parsed : initial;
  } catch {
    return initial;
  }
};

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
      addDay: (date, targets, mealCountTarget) =>
        setState((s) =>
          s.days.some((d) => d.date === date)
            ? s
            : {
                ...s,
                days: [{ id: uuid(), date, meals: [], targets, mealCountTarget }, ...s.days],
              },
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
