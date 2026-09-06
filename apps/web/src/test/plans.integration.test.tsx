import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, type Mock } from 'vitest';
import App from '../App';
import { api } from '../api';
import { StateProvider } from '../state';
import { todayIso } from '../lib';
import type { DailyMealLog, Plan, PlanMealIngredient, PlanSummary } from '@leanlog/data-access';

const now = new Date().toISOString();
const TODAY = todayIso();

const apiMock = api as unknown as {
  days: { list: Mock; get: Mock; applyPlan: Mock };
  plans: { list: Mock; get: Mock; reorder: Mock; addIngredientFromDatabase: Mock };
  nutritionDatabase: { search: Mock };
};

function planSummary(id: string, name: string, position: number): PlanSummary {
  return { id, userId: 'user_test', name, position, meals: [], createdAt: now, updatedAt: now };
}

function plan(id: string, name: string, meals: Plan['meals'] = []): Plan {
  return { id, userId: 'user_test', name, position: 0, meals, createdAt: now, updatedAt: now };
}

function planIngredient(overrides: Partial<PlanMealIngredient> = {}): PlanMealIngredient {
  return {
    id: 'pi1',
    planMealId: 'pm1',
    name: 'OATS',
    weight: 80,
    calories: 300,
    fat: 5,
    saturatedFat: 1,
    carbs: 50,
    fiber: 8,
    protein: 10,
    calorieSource: 'explicit',
    estimatedCalories: 300,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function dayWithMeal(mealName: string, ingredients: DailyMealLog['meals'][number]['ingredients']) {
  return {
    id: 'd1',
    userId: 'user_test',
    date: TODAY,
    targetCalories: 2700,
    targetFat: 75,
    targetCarbs: 236,
    targetProtein: 270,
    mealCountTarget: 1,
    weightLbs: null,
    shoulderInches: null,
    waistInches: null,
    bicepInches: null,
    thighInches: null,
    frontPhotoKey: null,
    sidePhotoKey: null,
    backPhotoKey: null,
    meals: [
      {
        id: 'm1',
        dailyMealLogId: 'd1',
        name: mealName,
        // Applied plan meals are always origin: 'template' (R23) so they stay
        // out of totals and show the Logged/Not logged rightMetric.
        origin: 'template' as const,
        logged: false,
        ingredients,
        createdAt: now,
        updatedAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  } satisfies DailyMealLog;
}

function renderApp(route: string) {
  return render(
    <StateProvider>
      <MemoryRouter initialEntries={[route]}>
        <App />
      </MemoryRouter>
    </StateProvider>,
  );
}

describe('plans', () => {
  afterEach(() => {
    cleanup();
    apiMock.days.list.mockReset();
    apiMock.days.list.mockResolvedValue({ days: [] });
    apiMock.days.get.mockReset();
    apiMock.days.applyPlan.mockReset();
    apiMock.plans.list.mockReset();
    apiMock.plans.list.mockResolvedValue({ plans: [] });
    apiMock.plans.get.mockReset();
    apiMock.plans.reorder.mockReset();
    apiMock.plans.addIngredientFromDatabase.mockReset();
  });

  it('lists plans and reorders via the Down button', async () => {
    apiMock.plans.list.mockResolvedValue({
      plans: [planSummary('p1', 'High protein day', 0), planSummary('p2', 'Rest day', 1)],
    });
    apiMock.plans.reorder.mockResolvedValue({
      plans: [planSummary('p2', 'Rest day', 0), planSummary('p1', 'High protein day', 1)],
    });

    renderApp('/track/goals/plans');

    await waitFor(() => expect(screen.getByText('High protein day')).toBeInTheDocument());
    expect(screen.getByText('Rest day')).toBeInTheDocument();

    await userEvent.click(screen.getAllByRole('button', { name: 'Move down' })[0]);
    await waitFor(() =>
      expect(apiMock.plans.reorder).toHaveBeenCalledWith('test-token', ['p2', 'p1']),
    );
  });

  it('adds an ingredient from the database via the plan meal editor', async () => {
    const dbResult = {
      id: 'db1',
      name: 'CHICKEN BREAST',
      servingAmount: 100,
      fat: 3,
      carbs: 0,
      protein: 31,
      fiber: 0,
      calories: 165,
      addedByUserId: 'user_test',
      creationSource: 'manual',
      saturatedFat: null,
      unsaturatedFat: null,
      monounsaturatedFat: null,
      polyunsaturatedFat: null,
      transFat: null,
      sugar: null,
      micronutrients: null,
      createdAt: new Date('2025-01-15').toISOString(),
      updatedAt: new Date('2025-01-15').toISOString(),
    };
    const created = planIngredient({
      id: 'pi2',
      name: 'CHICKEN BREAST',
      weight: 150,
      calories: 248,
      fat: 5,
      protein: 47,
      sourceDatabaseIngredientId: 'db1',
    });

    apiMock.plans.get.mockResolvedValue(
      plan('p1', 'High protein day', [
        {
          id: 'pm1',
          planId: 'p1',
          name: 'Breakfast',
          position: 0,
          ingredients: [],
          createdAt: now,
          updatedAt: now,
        },
      ]),
    );
    apiMock.nutritionDatabase.search.mockResolvedValue({ results: [dbResult], total: 1 });
    apiMock.plans.addIngredientFromDatabase.mockResolvedValue(created);

    renderApp('/track/goals/plans/p1/meal/pm1');

    await screen.findByRole('tab', { name: 'Nutrition Facts Database' });
    await userEvent.click(screen.getByRole('tab', { name: 'Nutrition Facts Database' }));

    const searchInput = await screen.findByPlaceholderText('e.g. Chicken breast');
    await userEvent.type(searchInput, 'ch');

    await waitFor(() => expect(screen.getByText('CHICKEN BREAST')).toBeInTheDocument(), {
      timeout: 1000,
    });

    const amountInput = screen.getByLabelText('Weight (g/ml)');
    await userEvent.clear(amountInput);
    await userEvent.type(amountInput, '150');

    await userEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() =>
      expect(apiMock.plans.addIngredientFromDatabase).toHaveBeenCalledWith(
        'test-token',
        'p1',
        'pm1',
        {
          databaseIngredientId: 'db1',
          mode: 'weight',
          amount: 150,
        },
      ),
    );
  });

  // #84 R23/R26: applying a plan fills matching unlogged/empty meals, reports
  // how many were filled vs. skipped, and never marks anything logged — so the
  // day's totals stay at zero until the user logs a meal themselves.
  it('applying a plan to today fills meals, reports the count, and leaves totals at zero', async () => {
    const day = dayWithMeal('Breakfast', []);
    const appliedDay = dayWithMeal('Breakfast', [
      {
        id: 'ing1',
        mealId: 'm1',
        name: 'OATS',
        weight: 80,
        calories: 300,
        fat: 5,
        saturatedFat: 1,
        carbs: 50,
        fiber: 8,
        protein: 10,
        calorieSource: 'explicit',
        estimatedCalories: 300,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    apiMock.days.list.mockResolvedValue({ days: [day] });
    apiMock.days.get.mockResolvedValue(day);
    apiMock.plans.list.mockResolvedValue({ plans: [planSummary('p1', 'High protein day', 0)] });
    apiMock.days.applyPlan.mockResolvedValue({ day: appliedDay, filled: 1, skipped: 0 });

    renderApp('/track/day/d1');

    await screen.findByText('High protein day');
    const select = screen.getByRole('combobox');
    await userEvent.selectOptions(select, 'p1');

    await userEvent.click(screen.getByRole('button', { name: 'Apply plan' }));

    await waitFor(() =>
      expect(apiMock.days.applyPlan).toHaveBeenCalledWith('test-token', 'd1', 'p1'),
    );
    expect(await screen.findByText(/Filled 1 meal, skipped 0/)).toBeInTheDocument();

    // The applied ingredient renders (day was replaced from the server), but the
    // meal is still unlogged, so day totals read zero (R23).
    expect(screen.getByText('Not logged')).toBeInTheDocument();
    expect(
      screen.getAllByText((_content, element) => (element?.textContent ?? '').includes('0 / 2700')),
    ).not.toHaveLength(0);
  });
});
