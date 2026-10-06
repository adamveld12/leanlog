import { useEffect } from 'react';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import posthog from 'posthog-js';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { AnalyticsProvider } from '@leanlog/ui';
import type { DailyMealLog, Ingredient, Meal } from '@leanlog/data-access';
import { api } from '../api';
import { todayIso } from '../lib';
import { StateProvider, useStore, type Store } from '../state';

const now = new Date().toISOString();
const TODAY = todayIso();

const apiMock = api as unknown as {
  days: { list: Mock; updateTargets: Mock; completeObjectives: Mock };
  ingredients: { upsert: Mock; delete: Mock };
  meals: { setLogged: Mock };
};

function ingredient(overrides: Partial<Ingredient> = {}): Ingredient {
  return {
    id: 'i1',
    mealId: 'm1',
    name: 'Food',
    weight: 100,
    calories: 0,
    fat: 0,
    saturatedFat: 0,
    carbs: 0,
    fiber: 0,
    protein: 0,
    calorieSource: 'explicit',
    estimatedCalories: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function meal(overrides: Partial<Meal> = {}): Meal {
  return {
    id: 'm1',
    dailyMealLogId: 'd1',
    name: 'Meal',
    origin: 'adhoc',
    logged: false,
    ingredients: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// One expected meal, targets 150P / 200C / 60F, so a single in-range meal plus a
// logged weight completes every objective.
function day(overrides: Partial<DailyMealLog> = {}): DailyMealLog {
  return {
    id: 'd1',
    userId: 'user_test',
    date: TODAY,
    targetCalories: 2000,
    targetFat: 60,
    targetCarbs: 200,
    targetProtein: 150,
    mealCountTarget: 1,
    weightLbs: null,
    shoulderInches: null,
    waistInches: null,
    bicepInches: null,
    thighInches: null,
    frontPhotoKey: null,
    sidePhotoKey: null,
    backPhotoKey: null,
    objectivesCompletedAt: null,
    meals: [meal()],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

const IN_RANGE = { calories: 1800, protein: 150, carbs: 200, fat: 60 };

const track = vi.fn();
let store: Store;

// Publishes the latest committed store to the test (from an effect, not render).
function Probe() {
  const current = useStore();
  useEffect(() => {
    store = current;
  });
  return null;
}

async function boot(days: DailyMealLog[]) {
  apiMock.days.list.mockResolvedValue({ days });
  render(
    <AnalyticsProvider track={track}>
      <StateProvider>
        <Probe />
      </StateProvider>
    </AnalyticsProvider>,
  );
  await waitFor(() => expect(store.days).toHaveLength(days.length));
}

const events = (name: string) => track.mock.calls.filter(([n]) => n === name);

describe('day objective analytics (#37)', () => {
  beforeEach(() => {
    track.mockReset();
    (posthog.captureException as Mock).mockReset();
    apiMock.days.updateTargets.mockReset();
    apiMock.days.completeObjectives.mockReset();
    apiMock.ingredients.upsert.mockReset();
    apiMock.ingredients.delete.mockReset();
  });
  afterEach(() => cleanup());

  describe('weight', () => {
    it('captures weight_logged with the day and value when weight first gets logged', async () => {
      await boot([day()]);
      apiMock.days.updateTargets.mockResolvedValue(day({ weightLbs: 182.5 }));

      await act(() => store.updateDayWeight('d1', 182.5));

      expect(events('day.objectives.completed.weight_logged')).toEqual([
        ['day.objectives.completed.weight_logged', { dayId: 'd1', dayDate: TODAY, value: 182.5 }],
      ]);
    });

    it('does not capture again when an already-logged weight is edited (R34)', async () => {
      await boot([day({ weightLbs: 182.5 })]);
      apiMock.days.updateTargets.mockResolvedValue(day({ weightLbs: 183 }));

      await act(() => store.updateDayWeight('d1', 183));

      expect(events('day.objectives.completed.weight_logged')).toHaveLength(0);
    });
  });

  describe('meals', () => {
    it('does not capture meal_eaten while a meal has no calories', async () => {
      await boot([day()]);
      apiMock.ingredients.upsert.mockResolvedValue(ingredient({ calories: 0 }));

      await act(() => store.upsertIngredient('d1', 'm1', ingredient({ calories: 0 }) as never));

      expect(events('day.objectives.completed.meal_eaten')).toHaveLength(0);
    });

    it('captures meal_eaten with value and total when a meal first becomes meaningful', async () => {
      await boot([day({ mealCountTarget: 4 })]);
      apiMock.ingredients.upsert.mockResolvedValue(ingredient({ calories: 250 }));

      await act(() => store.upsertIngredient('d1', 'm1', ingredient({ calories: 250 }) as never));

      expect(events('day.objectives.completed.meal_eaten')).toEqual([
        [
          'day.objectives.completed.meal_eaten',
          { dayId: 'd1', dayDate: TODAY, mealId: 'm1', value: 1, total: 4 },
        ],
      ]);
    });

    it('does not capture again when the same meal is edited or re-crosses the line', async () => {
      await boot([day({ mealCountTarget: 4 })]);
      apiMock.ingredients.upsert.mockResolvedValue(ingredient({ calories: 250 }));
      await act(() => store.upsertIngredient('d1', 'm1', ingredient({ calories: 250 }) as never));

      // Edit while already meaningful.
      apiMock.ingredients.upsert.mockResolvedValue(ingredient({ calories: 300 }));
      await act(() => store.upsertIngredient('d1', 'm1', ingredient({ calories: 300 }) as never));
      // Remove all food, then add it back: the same meal is not "newly" eaten.
      apiMock.ingredients.delete.mockResolvedValue(undefined);
      await act(() => store.removeIngredient('d1', 'm1', 'i1'));
      apiMock.ingredients.upsert.mockResolvedValue(ingredient({ calories: 250 }));
      await act(() => store.upsertIngredient('d1', 'm1', ingredient({ calories: 250 }) as never));

      expect(events('day.objectives.completed.meal_eaten')).toHaveLength(1);
    });

    // The meal was already meaningful when the app loaded, so this session never
    // saw it cross the line. Removing its food and re-adding it must not read as
    // the meal "first" becoming meaningful.
    it('does not capture for a meal that was already meaningful at load', async () => {
      const eaten = meal({ ingredients: [ingredient({ calories: 250 })] });
      await boot([day({ mealCountTarget: 4, meals: [eaten] })]);
      apiMock.ingredients.delete.mockResolvedValue(undefined);
      await act(() => store.removeIngredient('d1', 'm1', 'i1'));
      apiMock.ingredients.upsert.mockResolvedValue(ingredient({ calories: 250 }));

      await act(() => store.upsertIngredient('d1', 'm1', ingredient({ calories: 250 }) as never));

      expect(events('day.objectives.completed.meal_eaten')).toHaveLength(0);
    });

    // Server side-effect mirrored by the reducer: adding food auto-logs a plan
    // meal (R30), which is what makes it meaningful.
    it('captures meal_eaten when adding food to a plan-copied meal auto-logs it', async () => {
      await boot([
        day({ mealCountTarget: 0, meals: [meal({ origin: 'template', logged: false })] }),
      ]);
      apiMock.ingredients.upsert.mockResolvedValue(ingredient({ calories: 400 }));

      await act(() => store.upsertIngredient('d1', 'm1', ingredient({ calories: 400 }) as never));

      expect(events('day.objectives.completed.meal_eaten')).toHaveLength(1);
    });

    it('captures nothing for past days', async () => {
      await boot([day({ date: '2020-01-01', mealCountTarget: 4 })]);
      apiMock.ingredients.upsert.mockResolvedValue(ingredient({ calories: 250 }));

      await act(() => store.upsertIngredient('d1', 'm1', ingredient({ calories: 250 }) as never));

      expect(track).not.toHaveBeenCalled();
    });
  });

  describe('all objectives complete', () => {
    const completeDay = () =>
      day({ weightLbs: 180, meals: [meal({ ingredients: [ingredient(IN_RANGE)] })] });

    it('stamps the day via the server and captures day.objectives.completed once', async () => {
      await boot([day({ weightLbs: 180 })]);
      apiMock.ingredients.upsert.mockResolvedValue(ingredient(IN_RANGE));
      apiMock.days.completeObjectives.mockResolvedValue({
        ...completeDay(),
        objectivesCompletedAt: '2026-06-11T20:42:00.000Z',
      });

      await act(() => store.upsertIngredient('d1', 'm1', ingredient(IN_RANGE) as never));

      expect(apiMock.days.completeObjectives).toHaveBeenCalledWith('test-token', 'd1');
      expect(events('day.objectives.completed')).toEqual([
        ['day.objectives.completed', { dayId: 'd1', dayDate: TODAY }],
      ]);
      expect(store.days[0]!.objectivesCompletedAt).toBe('2026-06-11T20:42:00.000Z');
    });

    it('does not ask the server while any objective is outstanding', async () => {
      // No logged weight.
      await boot([day()]);
      apiMock.ingredients.upsert.mockResolvedValue(ingredient(IN_RANGE));

      await act(() => store.upsertIngredient('d1', 'm1', ingredient(IN_RANGE) as never));

      expect(apiMock.days.completeObjectives).not.toHaveBeenCalled();
      expect(events('day.objectives.completed')).toHaveLength(0);
    });

    it('never clears or re-captures once stamped, even if the day falls out of range (R27/R34)', async () => {
      await boot([{ ...completeDay(), objectivesCompletedAt: '2026-06-11T20:42:00.000Z' }]);
      const blown = ingredient({ ...IN_RANGE, fat: 200 });
      apiMock.ingredients.upsert.mockResolvedValue(blown);

      await act(() => store.upsertIngredient('d1', 'm1', blown as never));

      expect(apiMock.days.completeObjectives).not.toHaveBeenCalled();
      expect(events('day.objectives.completed')).toHaveLength(0);
      expect(store.days[0]!.objectivesCompletedAt).toBe('2026-06-11T20:42:00.000Z');
    });

    it('does not capture when the server declines to stamp (stale client)', async () => {
      await boot([day({ weightLbs: 180 })]);
      apiMock.ingredients.upsert.mockResolvedValue(ingredient(IN_RANGE));
      apiMock.days.completeObjectives.mockResolvedValue(completeDay()); // still null

      await act(() => store.upsertIngredient('d1', 'm1', ingredient(IN_RANGE) as never));

      expect(events('day.objectives.completed')).toHaveLength(0);
    });

    it('reports a failed stamp to PostHog without failing the user action', async () => {
      await boot([day({ weightLbs: 180 })]);
      apiMock.ingredients.upsert.mockResolvedValue(ingredient(IN_RANGE));
      const boom = new Error('network down');
      apiMock.days.completeObjectives.mockRejectedValue(boom);

      await act(() => store.upsertIngredient('d1', 'm1', ingredient(IN_RANGE) as never));

      expect(posthog.captureException).toHaveBeenCalledWith(boom, {
        context: 'day_objectives_complete',
      });
      expect(events('day.objectives.completed')).toHaveLength(0);
      // The edit itself still landed.
      expect(store.days[0]!.meals[0]!.ingredients).toHaveLength(1);
    });
  });
});
