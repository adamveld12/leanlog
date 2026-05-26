import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createContext, useContext, useState, type PropsWithChildren } from 'react';
import App from '../App';
import { todayIso } from '../lib';
import type { DailyMealLog, UserProfile } from '@leanlog/data-access';

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

type StoreCtx = {
  days: DailyMealLog[];
  profile: UserProfile;
  loading: boolean;
  error: null;
  ensureDayLoaded: (
    dayId: string,
  ) => Promise<{ status: 'found'; day: DailyMealLog } | { status: 'not_found' }>;
  addDay: (...args: unknown[]) => Promise<void>;
  removeDay: (id: string) => Promise<void>;
  addMeal: (...args: unknown[]) => Promise<null>;
  removeMeal: (...args: unknown[]) => Promise<void>;
  renameMeal: (...args: unknown[]) => Promise<void>;
  upsertIngredient: (...args: unknown[]) => Promise<void>;
  removeIngredient: (dayId: string, mealId: string, ingredientId: string) => Promise<void>;
  updateDayTargets: (...args: unknown[]) => Promise<void>;
  patchProfileLocal: (data: Partial<UserProfile>) => void;
  updateProfile: (...args: unknown[]) => Promise<void>;
};

const FakeStoreCtx = createContext<StoreCtx | null>(null);

function FakeStateProvider({
  children,
  initialDays,
}: PropsWithChildren<{ initialDays: DailyMealLog[] }>) {
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
    addDay: async () => {},
    removeDay: async (id: string) => {
      setDays((prev) => prev.filter((d) => d.id !== id));
    },
    addMeal: async () => null,
    removeMeal: async () => {},
    renameMeal: async () => {},
    upsertIngredient: async () => {},
    removeIngredient: async (dayId: string, mealId: string, ingredientId: string) => {
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

function renderApp(route: string, initialDays: DailyMealLog[]) {
  return render(
    <FakeStateProvider initialDays={initialDays}>
      <MemoryRouter initialEntries={[route]}>
        <App />
        <LocationProbe />
      </MemoryRouter>
    </FakeStateProvider>,
  );
}

function makeDayWithMeals(overrides: Partial<DailyMealLog> = {}): DailyMealLog {
  return {
    id: 'd1',
    userId: 'user_test',
    date: todayIso(),
    targetCalories: 2700,
    targetFat: 75,
    targetCarbs: 236,
    targetProtein: 270,
    mealCountTarget: 4,
    meals: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('list section behaviors', () => {
  afterEach(() => cleanup());

  it('day list row opens detail and supports delete', async () => {
    const initialDays = [
      makeDayWithMeals({
        meals: [
          {
            id: 'm1',
            dailyMealLogId: 'd1',
            name: 'BREAKFAST',
            createdAt: now,
            updatedAt: now,
            ingredients: [
              {
                id: 'i1',
                mealId: 'm1',
                name: 'EGG',
                weight: 50,
                calories: 100,
                fat: 7,
                saturatedFat: 2,
                carbs: 1,
                fiber: 0,
                protein: 8,
                createdAt: now,
                updatedAt: now,
              },
            ],
          },
        ],
      }),
    ];

    renderApp('/track', initialDays);

    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText(/100/)).toBeInTheDocument();

    await userEvent.click(screen.getByText('Today').closest('[role="link"]') as HTMLElement);
    expect(screen.getByText('Daily totals')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('link', { name: '← Back' }));
    await userEvent.click(screen.getAllByRole('button', { name: 'Delete day' })[0]);
    expect(screen.queryByText('Today')).not.toBeInTheDocument();
  });

  it('missing meal route redirects to the parent day', async () => {
    const initialDays = [
      makeDayWithMeals({
        meals: [
          {
            id: 'm1',
            dailyMealLogId: 'd1',
            name: 'LUNCH',
            createdAt: now,
            updatedAt: now,
            ingredients: [],
          },
        ],
      }),
    ];

    renderApp('/track/day/d1/meal/missing', initialDays);

    await waitFor(() => {
      expect(screen.getByTestId('location-probe')).toHaveTextContent('/track/day/d1');
    });
    expect(screen.getByText('Daily totals')).toBeInTheDocument();
  });

  it('ingredient list row opens ingredient editor and supports delete', async () => {
    const initialDays = [
      makeDayWithMeals({
        meals: [
          {
            id: 'm1',
            dailyMealLogId: 'd1',
            name: 'LUNCH',
            createdAt: now,
            updatedAt: now,
            ingredients: [
              {
                id: 'i1',
                mealId: 'm1',
                name: 'CHICKEN',
                weight: 120,
                calories: 220,
                fat: 6,
                saturatedFat: 1.5,
                carbs: 0,
                fiber: 0,
                protein: 42,
                createdAt: now,
                updatedAt: now,
              },
            ],
          },
        ],
      }),
    ];

    renderApp('/track/day/d1/meal/m1', initialDays);

    expect(
      screen.getAllByText((_content, element) => (element?.textContent ?? '').includes('220 kcal'))
        .length,
    ).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();
    expect(document.querySelector('footer')).toBeNull();

    await userEvent.click(screen.getByRole('link', { name: /CHICKEN/i }));
    expect(screen.getByDisplayValue('CHICKEN')).toBeInTheDocument();

    await userEvent.click(screen.getAllByRole('button', { name: 'Delete ingredient' })[0]);
    expect(screen.queryByRole('link', { name: /CHICKEN/i })).not.toBeInTheDocument();
  });
});
