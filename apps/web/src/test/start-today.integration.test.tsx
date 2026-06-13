import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createContext, useContext, useState, type PropsWithChildren } from 'react';
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
    meals: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

type AddDayOpts = {
  targetCalories: number;
  targetFat: number;
  targetCarbs: number;
  targetProtein: number;
};

type StoreCtx = {
  days: DailyMealLog[];
  profile: UserProfile;
  loading: boolean;
  error: null;
  ensureDayLoaded: (
    dayId: string,
  ) => Promise<{ status: 'found'; day: DailyMealLog } | { status: 'not_found' }>;
  addDay: (date: string, opts: AddDayOpts) => Promise<DailyMealLog>;
  removeDay: (id: string) => Promise<void>;
  addMeal: (...args: unknown[]) => Promise<null>;
  removeMeal: (...args: unknown[]) => Promise<void>;
  renameMeal: (...args: unknown[]) => Promise<void>;
  upsertIngredient: (...args: unknown[]) => Promise<void>;
  removeIngredient: (...args: unknown[]) => Promise<void>;
  addIngredientFromDatabase: (...args: unknown[]) => Promise<void>;
  searchNutritionDatabase: (query: string) => Promise<{ results: unknown[]; total: number }>;
  createNutritionDatabaseIngredient: (input: unknown) => Promise<unknown>;
  updateDayTargets: (...args: unknown[]) => Promise<void>;
  patchProfileLocal: (data: Partial<UserProfile>) => void;
  updateProfile: (...args: unknown[]) => Promise<void>;
};

const FakeStoreCtx = createContext<StoreCtx | null>(null);

const addDaySpy = vi.fn<(date: string, opts: AddDayOpts) => Promise<DailyMealLog>>();
const addMealSpy = vi.fn<(...args: unknown[]) => Promise<null>>(async () => null);

function FakeStateProvider({
  children,
  initialDays = [],
  addDayDelay,
}: PropsWithChildren<{ initialDays?: DailyMealLog[]; addDayDelay?: Promise<void> }>) {
  const [days, setDays] = useState<DailyMealLog[]>(initialDays);

  const store: StoreCtx = {
    days,
    profile: mockProfile,
    loading: false,
    error: null,
    ensureDayLoaded: async (dayId: string) => {
      const day = days.find((d) => d.id === dayId);
      return day ? { status: 'found', day } : { status: 'not_found' };
    },
    addDay: async (date, opts) => {
      addDaySpy(date, opts);
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
    const ctx = useContext(FakeStoreCtx);
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

describe('Log a meal quick action', () => {
  afterEach(() => {
    cleanup();
    addDaySpy.mockClear();
    addMealSpy.mockClear();
  });

  it('creates today using the profile-derived targets when no day exists', async () => {
    renderApp();

    await userEvent.click(screen.getByRole('button', { name: /Log a meal/i }));

    expect(addDaySpy).toHaveBeenCalledTimes(1);
    const [date, opts] = addDaySpy.mock.calls[0];
    expect(date).toBe(todayIso());
    // Meal structure now comes from templates server-side, not a client target.
    expect(opts).not.toHaveProperty('mealCountTarget');
  });

  it('navigates to the new day page after creating today', async () => {
    renderApp();

    await userEvent.click(screen.getByRole('button', { name: /Log a meal/i }));

    await waitFor(() => {
      expect(screen.getByTestId('location-probe')).toHaveTextContent('/track/day/new-day');
    });
  });

  it("opens today's existing day without creating a day or meal", async () => {
    renderApp([makeDay({ id: 'existing-today' })]);

    await userEvent.click(screen.getByRole('button', { name: /Log a meal/i }));

    expect(addDaySpy).not.toHaveBeenCalled();
    expect(addMealSpy).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByTestId('location-probe')).toHaveTextContent('/track/day/existing-today');
    });
  });

  it('ignores rapid double-clicks while day creation is in flight', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    renderApp(undefined, gate);

    const button = screen.getByRole('button', { name: /Log a meal/i });
    fireEvent.click(button);
    fireEvent.click(button);
    release();

    await waitFor(() => {
      expect(screen.getByTestId('location-probe')).toHaveTextContent('/track/day/new-day');
    });
    expect(addDaySpy).toHaveBeenCalledTimes(1);
  });
});
