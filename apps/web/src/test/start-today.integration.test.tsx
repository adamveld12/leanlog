import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createContext, use, useState, type PropsWithChildren } from 'react';
import posthog from 'posthog-js';
import App from '../App';
import { todayIso } from '../lib';
import type { DailyMealLog, UserProfile } from '@leanlog/data-access';

vi.mock('react-chartjs-2', () => ({ Line: () => null }));

const now = new Date().toISOString();

const mockProfile: UserProfile = {
  id: 'p1',
  clerkUserId: 'user_test',
  weightLbs: 180,
  heightInches: 72,
  calorieMode: 'maintenance',
  targetCalories: null,
  macroMode: 'percentage',
  macroFats: 25,
  macroCarbs: 35,
  macroProtein: 40,
  goalWeightLbs: null,
  goalBodyFatPct: null,
  frontBaselineDate: null,
  sideBaselineDate: null,
  backBaselineDate: null,
  createdAt: now,
  updatedAt: now,
};

function makeDay(overrides: Partial<DailyMealLog> = {}): DailyMealLog {
  return {
    id: 'new-day',
    userId: 'user_test',
    date: todayIso(),
    targetCalories: 2700,
    targetFat: 75,
    targetCarbs: 236,
    targetProtein: 270,
    mealCountTarget: 0,
    weightLbs: null,
    shoulderInches: null,
    waistInches: null,
    bicepInches: null,
    thighInches: null,
    frontPhotoKey: null,
    sidePhotoKey: null,
    backPhotoKey: null,
    objectivesCompletedAt: null,
    meals: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

type StoreCtx = {
  days: DailyMealLog[];
  goals: unknown[];
  plans: unknown[];
  profile: UserProfile;
  loading: boolean;
  error: null;
  ensureDayLoaded: (
    dayId: string,
  ) => Promise<{ status: 'found'; day: DailyMealLog } | { status: 'not_found' }>;
  addDay: (date: string) => Promise<DailyMealLog>;
  removeDay: (id: string) => Promise<void>;
  addMeal: (...args: unknown[]) => Promise<{ id: string } | null>;
  removeMeal: (...args: unknown[]) => Promise<void>;
  renameMeal: (...args: unknown[]) => Promise<void>;
  upsertIngredient: (...args: unknown[]) => Promise<void>;
  removeIngredient: (...args: unknown[]) => Promise<void>;
  addIngredientFromDatabase: (...args: unknown[]) => Promise<void>;
  applyPlanToDay: (...args: unknown[]) => Promise<{ filled: number; skipped: number }>;
  searchNutritionDatabase: (query: string) => Promise<{ results: unknown[]; total: number }>;
  createNutritionDatabaseIngredient: (input: unknown) => Promise<unknown>;
  updateDayTargets: (...args: unknown[]) => Promise<void>;
  patchProfileLocal: (data: Partial<UserProfile>) => void;
  updateProfile: (...args: unknown[]) => Promise<void>;
};

const FakeStoreCtx = createContext<StoreCtx | null>(null);

const addDaySpy = vi.fn<(date: string) => Promise<DailyMealLog>>();
const addMealSpy = vi.fn<(...args: unknown[]) => Promise<{ id: string } | null>>(async () => null);

function FakeStateProvider({
  children,
  initialDays = [],
  addDayDelay,
}: PropsWithChildren<{ initialDays?: DailyMealLog[]; addDayDelay?: Promise<void> }>) {
  const [days, setDays] = useState<DailyMealLog[]>(initialDays);

  const store: StoreCtx = {
    days,
    goals: [],
    plans: [],
    profile: mockProfile,
    loading: false,
    error: null,
    ensureDayLoaded: async (dayId: string) => {
      const day = days.find((d) => d.id === dayId);
      return day ? { status: 'found', day } : { status: 'not_found' };
    },
    addDay: async (date) => {
      addDaySpy(date);
      if (addDayDelay) await addDayDelay;
      const day = makeDay({ date });
      setDays((prev) => [day, ...prev]);
      return day;
    },
    removeDay: async () => {},
    addMeal: addMealSpy,
    removeMeal: async () => {},
    renameMeal: async () => {},
    upsertIngredient: async () => {},
    removeIngredient: async () => {},
    addIngredientFromDatabase: async () => {},
    applyPlanToDay: async () => ({ filled: 0, skipped: 0 }),
    searchNutritionDatabase: async () => ({ results: [], total: 0 }),
    createNutritionDatabaseIngredient: async () => ({}),
    updateDayTargets: async () => {},
    patchProfileLocal: () => {},
    updateProfile: async () => {},
  };

  return <FakeStoreCtx.Provider value={store}>{children}</FakeStoreCtx.Provider>;
}

vi.mock('../state', () => ({
  StateProvider: ({ children }: PropsWithChildren) => <>{children}</>,
  useStore: () => {
    const ctx = use(FakeStoreCtx);
    if (!ctx) throw new Error('FakeStoreCtx not provided');
    return ctx;
  },
}));

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location-probe">{location.pathname}</div>;
}

function renderApp(initialDays?: DailyMealLog[], addDayDelay?: Promise<void>) {
  return render(
    <FakeStateProvider initialDays={initialDays} addDayDelay={addDayDelay}>
      <MemoryRouter initialEntries={['/track']}>
        <App />
        <LocationProbe />
      </MemoryRouter>
    </FakeStateProvider>,
  );
}

describe("Log today's weight objective CTA", () => {
  afterEach(() => {
    cleanup();
    addDaySpy.mockClear();
    addMealSpy.mockClear();
  });

  it('creates today using the profile-derived targets when no day exists', async () => {
    renderApp();

    await userEvent.click(screen.getByRole('button', { name: /log today.s weight/i }));

    expect(addDaySpy).toHaveBeenCalledTimes(1);
    const [date] = addDaySpy.mock.calls[0];
    expect(date).toBe(todayIso());
    // Targets + meal slots are derived from the covering goal inside addDay (#56).
  });

  it('navigates to the new day page after creating today', async () => {
    renderApp();

    await userEvent.click(screen.getByRole('button', { name: /log today.s weight/i }));

    await waitFor(() => {
      expect(screen.getByTestId('location-probe')).toHaveTextContent('/track/day/new-day');
    });
  });

  it("opens today's existing day without creating a day or meal", async () => {
    renderApp([makeDay({ id: 'existing-today' })]);

    await userEvent.click(screen.getByRole('button', { name: /log today.s weight/i }));

    expect(addDaySpy).not.toHaveBeenCalled();
    expect(addMealSpy).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByTestId('location-probe')).toHaveTextContent('/track/day/existing-today');
    });
  });

  it('reports a failed day creation to PostHog instead of throwing', async () => {
    const boom = new Error('network down');
    const failing = Promise.reject(boom);
    failing.catch(() => {}); // awaited later by addDay; avoid an early unhandled warning
    vi.mocked(posthog.captureException).mockClear();
    renderApp(undefined, failing);

    await userEvent.click(screen.getByRole('button', { name: /log today.s weight/i }));

    await waitFor(() => {
      expect(posthog.captureException).toHaveBeenCalledWith(boom, {
        context: 'day_objectives_weight_log',
      });
    });
  });

  it('ignores rapid double-clicks while day creation is in flight', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    renderApp(undefined, gate);

    const button = screen.getByRole('button', { name: /log today.s weight/i });
    fireEvent.click(button);
    fireEvent.click(button);
    release();

    await waitFor(() => {
      expect(screen.getByTestId('location-probe')).toHaveTextContent('/track/day/new-day');
    });
    expect(addDaySpy).toHaveBeenCalledTimes(1);
  });
});

function food(id: string, calories: number) {
  return {
    id: `ing-${id}`,
    mealId: id,
    name: 'Food',
    weight: 100,
    calories,
    fat: 0,
    saturatedFat: 0,
    carbs: 0,
    fiber: 0,
    protein: 0,
    calorieSource: 'explicit' as const,
    estimatedCalories: 0,
    createdAt: now,
    updatedAt: now,
  };
}

function adhocMeal(id: string, calories = 0) {
  return {
    id,
    dailyMealLogId: 'today',
    name: id,
    origin: 'adhoc' as const,
    logged: false,
    ingredients: calories > 0 ? [food(id, calories)] : [],
    createdAt: now,
    updatedAt: now,
  };
}

describe("Today's objectives card", () => {
  afterEach(() => {
    cleanup();
    addDaySpy.mockClear();
    addMealSpy.mockClear();
  });

  it('leads the Day List with weight, meal and macro objectives for today', () => {
    renderApp([makeDay({ id: 'today', mealCountTarget: 4 })]);

    expect(screen.getByRole('heading', { name: /today.s objectives/i })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Weight incomplete' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Meals incomplete' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Macros incomplete' })).toBeInTheDocument();
  });

  it('is shown before today exists, fully incomplete, without creating the day', () => {
    renderApp([]);

    expect(screen.getByRole('img', { name: 'Weight incomplete' })).toBeInTheDocument();
    expect(addDaySpy).not.toHaveBeenCalled();
  });

  // R2: yesterday is for review. Its logged weight must not complete today's.
  it("only reflects today — yesterday's weight does not complete today's objective", () => {
    const yesterday = new Date(Date.now() - 86400000);
    const y = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    renderApp([makeDay({ id: 'yesterday', date: y, weightLbs: 181 })]);

    expect(screen.getByRole('img', { name: 'Weight incomplete' })).toBeInTheDocument();
  });

  it('shows the logged weight and drops the weight CTA once today has a weight', () => {
    renderApp([makeDay({ id: 'today', weightLbs: 182.5, mealCountTarget: 4 })]);

    expect(screen.getByRole('img', { name: 'Weight completed' })).toBeInTheDocument();
    expect(screen.getByText(/182\.5 lbs/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /log today.s weight/i })).not.toBeInTheDocument();
  });

  it('does not count an empty meal toward meal progress', () => {
    renderApp([makeDay({ id: 'today', mealCountTarget: 4, meals: [adhocMeal('m1')] })]);

    expect(screen.getByRole('progressbar', { name: 'Meals progress' })).toHaveAttribute(
      'aria-valuenow',
      '0',
    );
  });

  describe('next-meal CTA', () => {
    it('continues the first meal that is not yet meaningful', async () => {
      renderApp([
        makeDay({
          id: 'today',
          weightLbs: 182.5,
          mealCountTarget: 4,
          meals: [adhocMeal('m1', 400), adhocMeal('m2')],
        }),
      ]);

      await userEvent.click(screen.getByRole('button', { name: /log meal 2 of 4/i }));

      expect(addMealSpy).not.toHaveBeenCalled();
      await waitFor(() => {
        expect(screen.getByTestId('location-probe')).toHaveTextContent('/track/day/today/meal/m2');
      });
    });

    it('adds a new meal when every existing one already has food', async () => {
      addMealSpy.mockResolvedValueOnce({ id: 'fresh' });
      renderApp([
        makeDay({
          id: 'today',
          weightLbs: 182.5,
          mealCountTarget: 4,
          meals: [adhocMeal('m1', 400)],
        }),
      ]);

      await userEvent.click(screen.getByRole('button', { name: /log meal 2 of 4/i }));

      expect(addMealSpy).toHaveBeenCalledWith('today', '');
      await waitFor(() => {
        expect(screen.getByTestId('location-probe')).toHaveTextContent(
          '/track/day/today/meal/fresh',
        );
      });
    });

    it('ignores a rapid double-tap instead of creating two meals', async () => {
      let release!: (meal: { id: string }) => void;
      addMealSpy.mockImplementationOnce(() => new Promise((resolve) => (release = resolve)));
      renderApp([
        makeDay({
          id: 'today',
          weightLbs: 182.5,
          mealCountTarget: 4,
          meals: [adhocMeal('m1', 400)],
        }),
      ]);

      const cta = screen.getByRole('button', { name: /log meal 2 of 4/i });
      fireEvent.click(cta);
      fireEvent.click(cta);
      release({ id: 'fresh' });

      await waitFor(() => {
        expect(screen.getByTestId('location-probe')).toHaveTextContent(
          '/track/day/today/meal/fresh',
        );
      });
      expect(addMealSpy).toHaveBeenCalledTimes(1);
    });

    // A plan-copied meal arrives pre-filled; the Log control lives on the Day
    // page, not the meal editor, so that is where the user must be sent.
    it('sends the user to the day page to log a pre-filled plan meal', async () => {
      const planMeal = { ...adhocMeal('p1', 400), origin: 'template' as const };
      renderApp([
        makeDay({ id: 'today', weightLbs: 182.5, mealCountTarget: 4, meals: [planMeal] }),
      ]);

      await userEvent.click(screen.getByRole('button', { name: /log meal 1 of 1/i }));

      await waitFor(() => {
        expect(screen.getByTestId('location-probe')).toHaveTextContent('/track/day/today');
      });
      expect(screen.getByTestId('location-probe')).not.toHaveTextContent('/meal/');
    });
  });
});
