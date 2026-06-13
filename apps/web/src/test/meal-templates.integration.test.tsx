import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, type Mock } from 'vitest';
import App from '../App';
import { api } from '../api';
import { StateProvider } from '../state';
import { todayIso } from '../lib';
import type {
  DailyMealLog,
  Ingredient,
  MealTemplate,
  MealTemplateIngredient,
} from '@leanlog/data-access';

const now = new Date().toISOString();

const apiMock = api as unknown as {
  days: { list: Mock; get: Mock };
  meals: { setLogged: Mock };
  mealTemplates: { list: Mock; reorder: Mock; addIngredientFromDatabase: Mock };
  nutritionDatabase: { search: Mock };
};

function template(id: string, name: string, position: number): MealTemplate {
  return {
    id,
    userId: 'user_test',
    name,
    position,
    ingredients: [],
    createdAt: now,
    updatedAt: now,
  };
}

function ingredient(id: string, mealId: string): Ingredient {
  return {
    id,
    mealId,
    name: 'EGGS',
    weight: 100,
    calories: 140,
    fat: 10,
    saturatedFat: 3,
    carbs: 1,
    fiber: 0,
    protein: 12,
    calorieSource: 'explicit',
    estimatedCalories: 140,
    createdAt: now,
    updatedAt: now,
  };
}

function templateBackedDay(mealIngredients: Ingredient[] = [ingredient('i1', 'm1')]): DailyMealLog {
  return {
    id: 'd1',
    userId: 'user_test',
    date: todayIso(),
    targetCalories: 2700,
    targetFat: 75,
    targetCarbs: 236,
    targetProtein: 270,
    mealCountTarget: 1,
    weightLbs: null,
    meals: [
      {
        id: 'm1',
        dailyMealLogId: 'd1',
        name: 'Breakfast',
        origin: 'template',
        // Copied meals start unlogged even with default ingredients (R12).
        logged: false,
        ingredients: mealIngredients,
        createdAt: now,
        updatedAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
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

describe('meal templates', () => {
  afterEach(() => {
    cleanup();
    apiMock.days.list.mockResolvedValue({ days: [] });
    apiMock.mealTemplates.list.mockResolvedValue({ templates: [] });
  });

  it('lists templates and reorders via the Down button', async () => {
    apiMock.days.list.mockResolvedValue({ days: [] });
    apiMock.mealTemplates.list.mockResolvedValue({
      templates: [template('t1', 'Breakfast', 0), template('t2', 'Lunch', 1)],
    });
    apiMock.mealTemplates.reorder.mockResolvedValue({
      templates: [template('t2', 'Lunch', 0), template('t1', 'Breakfast', 1)],
    });

    renderApp('/track/templates');

    await waitFor(() => expect(screen.getByText('Breakfast')).toBeInTheDocument());
    expect(screen.getByText('Lunch')).toBeInTheDocument();

    // Move "Breakfast" down -> reorder called with the swapped id order.
    await userEvent.click(screen.getAllByRole('button', { name: 'Move down' })[0]);
    await waitFor(() =>
      expect(apiMock.mealTemplates.reorder).toHaveBeenCalledWith('test-token', ['t2', 't1']),
    );
  });

  it('exposes a Log action on an unlogged copied meal and logs it', async () => {
    const day = templateBackedDay();
    apiMock.days.list.mockResolvedValue({ days: [day] });
    apiMock.days.get.mockResolvedValue(day);
    apiMock.mealTemplates.list.mockResolvedValue({ templates: [] });
    apiMock.meals.setLogged.mockResolvedValue({ ...day.meals[0], logged: true });

    renderApp('/track/day/d1');

    const logButton = await screen.findByRole('button', { name: 'Log' });
    await userEvent.click(logButton);

    await waitFor(() =>
      expect(apiMock.meals.setLogged).toHaveBeenCalledWith('test-token', 'd1', 'm1', true),
    );
  });

  it('an empty copied meal shows "Not logged" and exposes no Log action', async () => {
    const day = templateBackedDay([]); // unlogged, zero ingredients
    apiMock.days.list.mockResolvedValue({ days: [day] });
    apiMock.days.get.mockResolvedValue(day);
    apiMock.mealTemplates.list.mockResolvedValue({ templates: [] });

    renderApp('/track/day/d1');

    expect(await screen.findByText('Not logged')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Log' })).not.toBeInTheDocument();
  });

  it('adds an ingredient from the database via the template editor Database tab', async () => {
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
      addedByName: 'Test User',
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
    const created: MealTemplateIngredient = {
      id: 'ti1',
      templateId: 't1',
      name: 'CHICKEN BREAST',
      weight: 150,
      calories: 248,
      fat: 5,
      saturatedFat: 0,
      carbs: 0,
      fiber: 0,
      protein: 47,
      unsaturatedFat: null,
      monounsaturatedFat: null,
      polyunsaturatedFat: null,
      transFat: null,
      sugar: null,
      sugarAlcohol: null,
      allulose: null,
      alcohol: null,
      calorieSource: 'explicit',
      estimatedCalories: 248,
      micronutrients: null,
      sourceDatabaseIngredientId: 'db1',
      createdAt: now,
      updatedAt: now,
    };

    apiMock.days.list.mockResolvedValue({ days: [] });
    apiMock.mealTemplates.list.mockResolvedValue({
      templates: [template('t1', 'Breakfast', 0)],
    });
    apiMock.nutritionDatabase.search.mockResolvedValue({ results: [dbResult], total: 1 });
    apiMock.mealTemplates.addIngredientFromDatabase.mockResolvedValue(created);

    renderApp('/track/templates/t1');

    await screen.findByRole('tab', { name: 'Nutrition Database' });
    await userEvent.click(screen.getByRole('tab', { name: 'Nutrition Database' }));

    // The template editor's Database tab is search-and-add only: no create form.
    expect(
      screen.queryByRole('button', { name: 'Add database ingredient' }),
    ).not.toBeInTheDocument();

    const searchInput = await screen.findByPlaceholderText('e.g. Chicken breast');
    await userEvent.type(searchInput, 'ch');

    await waitFor(() => expect(screen.getByText('CHICKEN BREAST')).toBeInTheDocument(), {
      timeout: 1000,
    });

    const amountInput = screen.getByLabelText('Amount (g/ml)');
    await userEvent.clear(amountInput);
    await userEvent.type(amountInput, '150');

    await userEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() =>
      expect(apiMock.mealTemplates.addIngredientFromDatabase).toHaveBeenCalledWith(
        'test-token',
        't1',
        {
          databaseIngredientId: 'db1',
          measuredAmount: 150,
        },
      ),
    );
  });
});
