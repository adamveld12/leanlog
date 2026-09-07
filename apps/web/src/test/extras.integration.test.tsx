import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, type Mock } from 'vitest';
import App from '../App';
import { api } from '../api';
import { StateProvider } from '../state';
import { todayIso } from '../lib';
import type { DailyMealLog, Ingredient, Meal } from '@leanlog/data-access';

const now = new Date().toISOString();
const TODAY = todayIso();
const YESTERDAY = '2020-01-01'; // any date strictly before "today" in the test clock

const apiMock = api as unknown as {
  days: { list: Mock; get: Mock };
  extras: { add: Mock };
  ingredients: { upsert: Mock; delete: Mock };
};

function extraIngredient(overrides: Partial<Ingredient> = {}): Ingredient {
  return {
    id: 'e1',
    mealId: 'extras-meal',
    name: 'Tortilla chips',
    weight: 0,
    calories: 150,
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

function extrasMeal(ingredients: Ingredient[] = []): Meal {
  return {
    id: 'extras-meal',
    dailyMealLogId: 'd1',
    name: 'Extras',
    origin: 'extra',
    logged: false,
    ingredients,
    createdAt: now,
    updatedAt: now,
  };
}

function makeDay(overrides: Partial<DailyMealLog> = {}): DailyMealLog {
  return {
    id: 'd1',
    userId: 'user_test',
    date: TODAY,
    targetCalories: 2000,
    targetFat: 70,
    targetCarbs: 250,
    targetProtein: 140,
    mealCountTarget: 0,
    weightLbs: null,
    shoulderInches: null,
    waistInches: null,
    bicepInches: null,
    thighInches: null,
    frontPhotoKey: null,
    sidePhotoKey: null,
    backPhotoKey: null,
    meals: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
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

describe('extras (#64)', () => {
  afterEach(() => {
    cleanup();
    apiMock.days.list.mockReset();
    apiMock.days.list.mockResolvedValue({ days: [] });
    apiMock.days.get.mockReset();
    apiMock.extras.add.mockReset();
    apiMock.ingredients.upsert.mockReset();
    apiMock.ingredients.delete.mockReset();
  });

  it('quick-adds an extra with calories only and reflects it in the totals (R3, scenario: calories only)', async () => {
    apiMock.days.get.mockResolvedValue(makeDay());
    apiMock.extras.add.mockResolvedValue(extrasMeal([extraIngredient()]));

    renderApp('/track/day/d1');

    await screen.findByText('Extras');
    await userEvent.click(screen.getByRole('button', { name: '+ Add extra' }));
    await userEvent.type(screen.getByLabelText('Name'), 'Tortilla chips');
    await userEvent.type(screen.getByLabelText('Calories'), '150');
    await userEvent.click(screen.getByRole('button', { name: 'Add extra' }));

    await waitFor(() =>
      expect(apiMock.extras.add).toHaveBeenCalledWith(
        'test-token',
        'd1',
        expect.objectContaining({ name: 'Tortilla chips', calories: 150 }),
      ),
    );
    // The Extras meal returned by the server is merged into state and rendered.
    expect(await screen.findByText('Tortilla chips')).toBeInTheDocument();
    // Meals X/Y is untouched by an extras-only day (R4).
    expect(screen.getByText('Meals 0 / 0')).toBeInTheDocument();
  });

  it('edits an existing extra via the standard ingredient upsert route (scenario: edit an extra)', async () => {
    apiMock.days.get.mockResolvedValue(
      makeDay({ meals: [extrasMeal([extraIngredient({ calories: 150 })])] }),
    );
    apiMock.ingredients.upsert.mockResolvedValue(extraIngredient({ calories: 180 }));

    renderApp('/track/day/d1');

    await userEvent.click(await screen.findByText('Tortilla chips'));
    const calories = screen.getByLabelText('Calories');
    await userEvent.clear(calories);
    await userEvent.type(calories, '180');
    await userEvent.click(screen.getByRole('button', { name: 'Save extra' }));

    await waitFor(() =>
      expect(apiMock.ingredients.upsert).toHaveBeenCalledWith(
        'test-token',
        'd1',
        'extras-meal',
        expect.objectContaining({ id: 'e1', mealId: 'extras-meal', calories: 180 }),
      ),
    );
  });

  it('deletes an extra via the standard ingredient delete route (scenario: delete an extra)', async () => {
    apiMock.days.get.mockResolvedValue(makeDay({ meals: [extrasMeal([extraIngredient()])] }));
    apiMock.ingredients.delete.mockResolvedValue(undefined);

    renderApp('/track/day/d1');

    await screen.findByText('Tortilla chips');
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() =>
      expect(apiMock.ingredients.delete).toHaveBeenCalledWith(
        'test-token',
        'd1',
        'extras-meal',
        'e1',
      ),
    );
  });

  it('is read-only on a past day (R11/scenario: cannot add or edit on a past day)', async () => {
    apiMock.days.get.mockResolvedValue(
      makeDay({ date: YESTERDAY, meals: [extrasMeal([extraIngredient()])] }),
    );

    renderApp('/track/day/d1');

    await screen.findByText('Tortilla chips');
    expect(screen.queryByRole('button', { name: '+ Add extra' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });
});
