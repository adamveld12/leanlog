import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, type Mock } from 'vitest';
import App from '../App';
import { api } from '../api';
import { StateProvider } from '../state';
import { todayIso } from '../lib';
import type { DailyMealLog, Ingredient, MealTemplate } from '@leanlog/data-access';

const now = new Date().toISOString();

const apiMock = api as unknown as {
  days: { list: Mock; get: Mock };
  meals: { setLogged: Mock };
  mealTemplates: { list: Mock; reorder: Mock };
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

function templateBackedDay(): DailyMealLog {
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
        logged: false,
        ingredients: [ingredient('i1', 'm1')],
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
});
