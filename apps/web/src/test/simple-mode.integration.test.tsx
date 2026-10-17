import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, type Mock } from 'vitest';
import App from '../App';
import { api } from '../api';
import { StateProvider } from '../state';
import { prettyDate, todayIso } from '../lib';
import { addDaysIso } from '@leanlog/data-access';
import type { DailyMealLog, Ingredient, Meal, UserProfile } from '@leanlog/data-access';

const now = new Date().toISOString();
const TODAY = todayIso();

const apiMock = api as unknown as {
  days: { list: Mock; get: Mock; create: Mock };
  meals: { create: Mock; delete: Mock };
  ingredients: { upsert: Mock; delete: Mock };
  profile: { get: Mock; update: Mock };
};

function profile(appMode: 'full' | 'simple'): UserProfile {
  return {
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
    appMode,
    createdAt: now,
    updatedAt: now,
  };
}

function ingredient(overrides: Partial<Ingredient> = {}): Ingredient {
  return {
    id: 'i1',
    mealId: 'lunch-meal',
    name: 'CHICKEN BREAST',
    weight: 0,
    calories: 250,
    fat: 5,
    saturatedFat: 0,
    carbs: 0,
    fiber: 0,
    protein: 45,
    calorieSource: 'explicit',
    estimatedCalories: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function meal(overrides: Partial<Meal> = {}): Meal {
  return {
    id: 'lunch-meal',
    dailyMealLogId: 'today',
    name: 'Lunch',
    origin: 'adhoc',
    logged: false,
    ingredients: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function day(overrides: Partial<DailyMealLog> = {}): DailyMealLog {
  return {
    id: 'today',
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
    objectivesCompletedAt: null,
    meals: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function renderApp(route: string) {
  return render(
    <StateProvider>
      <MemoryRouter initialEntries={[route]}>
        <App />
        <LocationProbe />
      </MemoryRouter>
    </StateProvider>,
  );
}

const section = (name: string) => screen.findByRole('region', { name });

// The section's inline entry form, once it has expanded open.
async function entryOf(name: string) {
  const card = await section(name);
  const form = await within(card).findByTestId('section-entry');
  await waitFor(() => expect(form).not.toHaveAttribute('aria-hidden', 'true'));
  return form;
}

describe('simple mode (#102)', () => {
  beforeEach(() => {
    apiMock.profile.get.mockResolvedValue(profile('simple'));
  });

  afterEach(() => {
    apiMock.profile.get.mockReset();
    apiMock.profile.get.mockResolvedValue(profile('full'));
    apiMock.profile.update.mockReset();
    apiMock.days.list.mockReset();
    apiMock.days.list.mockResolvedValue({ days: [] });
    apiMock.days.create.mockReset();
    apiMock.meals.create.mockReset();
    apiMock.meals.delete.mockReset();
    apiMock.ingredients.upsert.mockReset();
    apiMock.ingredients.delete.mockReset();
  });

  describe('routing', () => {
    it('lands a simple-mode account on the Entry page for today', async () => {
      renderApp('/');
      await section('Breakfast');
      for (const name of ['Lunch', 'Dinner', 'Snacks']) {
        expect(screen.getByRole('region', { name })).toBeInTheDocument();
      }
      expect(screen.getByTestId('location')).toHaveTextContent('/simple');
      expect(screen.getByRole('link', { name: 'Stats' })).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Goals' })).not.toBeInTheDocument();
    });

    it('sends a simple-mode account away from full-mode pages', async () => {
      renderApp('/track/goals');
      await section('Breakfast');
      expect(screen.getByTestId('location')).toHaveTextContent(/^\/simple$/);
    });

    it('sends a full-mode account away from simple-mode pages', async () => {
      apiMock.profile.get.mockResolvedValue(profile('full'));
      renderApp('/simple/stats');
      await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/track$/));
    });
  });

  describe('Entry page', () => {
    it('adds food to Lunch inline on a day that does not exist yet', async () => {
      const created = day();
      apiMock.days.create.mockResolvedValue(created);
      apiMock.meals.create.mockResolvedValue(meal());
      apiMock.ingredients.upsert.mockImplementation((_t, _d, mealId, ing) =>
        Promise.resolve({ ...ingredient(), ...ing, mealId }),
      );

      renderApp('/simple');
      await userEvent.click(await screen.findByRole('button', { name: 'Add food to Lunch' }));

      const form = await entryOf('Lunch');
      // Simple mode never applies a plan: the day is created without a goal.
      expect(apiMock.days.create).toHaveBeenCalledWith(
        'test-token',
        expect.not.objectContaining({ goalId: expect.anything() }),
      );
      expect(apiMock.days.create.mock.calls[0]![1]).toMatchObject({ date: TODAY });
      expect(apiMock.meals.create).toHaveBeenCalledWith('test-token', 'today', 'Lunch');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      await userEvent.click(within(form).getByRole('tab', { name: 'Manual Entry' }));
      await userEvent.type(within(form).getByLabelText('Ingredient Name'), 'chicken breast');
      await userEvent.type(within(form).getByLabelText('Calories (kcal)'), '250');
      await userEvent.type(within(form).getByLabelText('Protein'), '45');
      await userEvent.click(within(form).getByRole('button', { name: 'Add' }));

      const lunch = await section('Lunch');
      await waitFor(() => expect(within(lunch).getByText('CHICKEN BREAST')).toBeInTheDocument());
      expect(within(lunch).getByTestId('section-calories')).toHaveTextContent('250 kcal');

      await userEvent.click(within(lunch).getByRole('button', { name: 'Done adding to Lunch' }));
      expect(within(lunch).getByTestId('section-entry')).toHaveAttribute('aria-hidden', 'true');
      expect(within(lunch).getByRole('button', { name: 'Add food to Lunch' })).toBeInTheDocument();
      expect(apiMock.meals.delete).not.toHaveBeenCalled();
    });

    it('keeps only one section open at a time', async () => {
      apiMock.days.list.mockResolvedValue({
        days: [day({ meals: [meal(), meal({ id: 'dinner-meal', name: 'Dinner' })] })],
      });

      renderApp('/simple');
      await userEvent.click(await screen.findByRole('button', { name: 'Add food to Lunch' }));
      await entryOf('Lunch');
      await userEvent.click(screen.getByRole('button', { name: 'Add food to Dinner' }));
      await entryOf('Dinner');

      const lunch = await section('Lunch');
      expect(within(lunch).getByRole('button', { name: 'Add food to Lunch' })).toBeInTheDocument();
      expect(within(lunch).getByTestId('section-entry')).toHaveAttribute('aria-hidden', 'true');
    });

    it('edits a food inline by tapping it', async () => {
      apiMock.days.list.mockResolvedValue({
        days: [day({ meals: [meal({ ingredients: [ingredient()] })] })],
      });

      renderApp('/simple');
      const lunch = await section('Lunch');
      await userEvent.click(within(lunch).getByRole('button', { name: /^CHICKEN BREAST/ }));

      const form = await entryOf('Lunch');
      expect(within(form).getByLabelText('Ingredient Name')).toHaveValue('CHICKEN BREAST');
      expect(within(form).getByRole('button', { name: 'Update' })).toBeInTheDocument();
    });

    it('creates the section meal once even if Add food is tapped twice quickly', async () => {
      apiMock.days.list.mockResolvedValue({ days: [day()] });
      let resolveMeal: (m: Meal) => void = () => {};
      apiMock.meals.create.mockReturnValue(new Promise<Meal>((r) => (resolveMeal = r)));

      renderApp('/simple');
      const add = await screen.findByRole('button', { name: 'Add food to Dinner' });
      await userEvent.click(add);
      await userEvent.click(add);
      resolveMeal(meal({ id: 'dinner-meal', name: 'Dinner' }));

      await entryOf('Dinner');
      expect(apiMock.meals.create).toHaveBeenCalledTimes(1);
    });

    it('removes a section meal it created when closed with nothing added', async () => {
      apiMock.days.list.mockResolvedValue({ days: [day()] });
      apiMock.meals.create.mockResolvedValue(meal({ id: 'breakfast-meal', name: 'Breakfast' }));
      apiMock.meals.delete.mockResolvedValue(undefined);

      renderApp('/simple');
      await userEvent.click(await screen.findByRole('button', { name: 'Add food to Breakfast' }));
      await entryOf('Breakfast');
      await userEvent.click(screen.getByRole('button', { name: 'Done adding to Breakfast' }));

      await waitFor(() =>
        expect(apiMock.meals.delete).toHaveBeenCalledWith('test-token', 'today', 'breakfast-meal'),
      );
    });

    it('tells the user when a section could not be opened instead of doing nothing', async () => {
      apiMock.days.list.mockResolvedValue({ days: [day()] });
      apiMock.meals.create.mockRejectedValue(new Error('API 409: nope'));

      renderApp('/simple');
      await userEvent.click(await screen.findByRole('button', { name: 'Add food to Lunch' }));

      const lunch = await section('Lunch');
      expect(await within(lunch).findByText(/Couldn.t open Lunch/)).toBeInTheDocument();
      expect(within(lunch).queryByTestId('section-entry')).not.toBeInTheDocument();
    });

    it('deletes a food from its section', async () => {
      apiMock.days.list.mockResolvedValue({
        days: [day({ meals: [meal({ ingredients: [ingredient()] })] })],
      });
      apiMock.ingredients.delete.mockResolvedValue(undefined);

      renderApp('/simple');
      const lunch = await section('Lunch');
      await userEvent.click(within(lunch).getByRole('button', { name: 'Delete CHICKEN BREAST' }));

      await waitFor(() =>
        expect(within(lunch).queryByText('CHICKEN BREAST')).not.toBeInTheDocument(),
      );
      expect(apiMock.ingredients.delete).toHaveBeenCalledWith(
        'test-token',
        'today',
        'lunch-meal',
        'i1',
      );
    });

    it('shows only today, never an earlier day', async () => {
      apiMock.days.list.mockResolvedValue({
        days: [
          day({
            id: 'old',
            date: addDaysIso(TODAY, -1),
            meals: [
              meal({ dailyMealLogId: 'old', ingredients: [ingredient({ name: 'OLD FOOD' })] }),
            ],
          }),
        ],
      });
      renderApp('/simple');
      await section('Lunch');
      expect(screen.queryByText('OLD FOOD')).not.toBeInTheDocument();
    });
  });

  describe('Stats page', () => {
    it('lists the last 7 days, averages over all 7, and expands a day read-only', async () => {
      apiMock.days.list.mockResolvedValue({
        days: [
          day({
            meals: [meal({ ingredients: [ingredient({ calories: 700 })] })],
            weightLbs: 182.4,
          }),
          day({
            id: 'two-ago',
            date: addDaysIso(TODAY, -2),
            meals: [
              meal({
                id: 'b',
                name: 'Breakfast',
                dailyMealLogId: 'two-ago',
                ingredients: [ingredient({ id: 'eggs', mealId: 'b', name: 'EGGS', calories: 700 })],
              }),
            ],
          }),
        ],
      });

      renderApp('/simple/stats');

      // (700 + 700) / 7 = 200 per day.
      expect(await screen.findByTestId('week-average')).toHaveTextContent('200 kcal');
      expect(screen.getAllByText('Not logged')).toHaveLength(5);

      const todayRow = screen.getByRole('button', { name: /Today/ });
      expect(todayRow).toHaveTextContent('182.4 lbs');

      const twoAgo = screen.getByRole('button', {
        name: new RegExp(prettyDate(addDaysIso(TODAY, -2))),
      });
      await userEvent.click(twoAgo);
      const breakfast = await screen.findByRole('region', { name: 'Breakfast' });
      expect(within(breakfast).getByText('EGGS')).toBeInTheDocument();
      expect(within(breakfast).queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('switching modes', () => {
    it('switches a simple-mode account to full leanlog from the account menu', async () => {
      apiMock.profile.update.mockResolvedValue(profile('full'));
      renderApp('/simple');
      await userEvent.click(await screen.findByRole('button', { name: 'Switch to full LeanLog' }));

      await waitFor(() =>
        expect(apiMock.profile.update).toHaveBeenCalledWith('test-token', { appMode: 'full' }),
      );
      await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/track$/));
    });

    it('switches a full-mode account to simple mode', async () => {
      apiMock.profile.get.mockResolvedValue(profile('full'));
      apiMock.profile.update.mockResolvedValue(profile('simple'));
      renderApp('/track');
      await userEvent.click(await screen.findByRole('button', { name: 'Switch to simple mode' }));

      await waitFor(() =>
        expect(apiMock.profile.update).toHaveBeenCalledWith('test-token', { appMode: 'simple' }),
      );
      await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/simple$/));
    });
  });
});
