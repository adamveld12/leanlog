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
import { format } from 'date-fns';
import { v4 as uuid } from 'uuid';
import type { AppState, Day, Meal } from './types';

const KEY = 'mealTracker.v1';
const today = () => format(new Date(), 'yyyy-MM-dd');

const initial: AppState = {
  version: 1,
  settings: {
    calorieTarget: 2000,
    mealCountTarget: 3,
    macroTargets: { fat: 70, saturatedFat: 20, carbs: 250, fiber: 30, protein: 140 },
    theme: 'system',
  },
  days: [{ id: uuid(), date: today(), meals: [] }],
  ingredientLibrary: [],
};

type Store = {
  state: AppState;
  setState: Dispatch<SetStateAction<AppState>>;
  addDay: (date: string) => void;
  addMeal: (dayId: string, name: string) => Meal | null;
};

const Ctx = createContext<Store | null>(null);

export function StateProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<AppState>(() => {
    const raw = localStorage.getItem(KEY);
    if (!raw) return initial;
    try {
      const parsed = JSON.parse(raw) as AppState;
      return parsed.days.length ? parsed : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(state));
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
      addMeal: (dayId, name) => {
        const meal: Meal = { id: uuid(), name: name.trim() || 'Untitled meal', ingredients: [] };
        setState((s) => ({
          ...s,
          days: s.days.map((d: Day) => (d.id === dayId ? { ...d, meals: [...d.meals, meal] } : d)),
        }));
        return meal;
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
