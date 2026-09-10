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
  days: { list: Mock; get: Mock; create: Mock };
  extras: { add: Mock; addFromDatabase: Mock };
  ingredients: { upsert: Mock; delete: Mock };
  nutritionDatabase: { search: Mock };
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
    apiMock.days.create.mockReset();
    apiMock.extras.add.mockReset();
    apiMock.extras.addFromDatabase.mockReset();
    apiMock.nutritionDatabase.search.mockReset();
    apiMock.nutritionDatabase.search.mockResolvedValue({ results: [], total: 0 });
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
    // The Daily Totals card reflects the 150 calories (R3).
    expect(screen.getByText(/150 \/ 2000/)).toBeInTheDocument();
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

  it('"Log an extra" opens an inline control on the Track page — no navigation, targets today when it exists (scenario)', async () => {
    apiMock.days.list.mockResolvedValue({ days: [makeDay()] });
    apiMock.extras.add.mockResolvedValue(
      extrasMeal([extraIngredient({ name: 'Red wine', calories: 125 })]),
    );

    render(
      <StateProvider>
        <MemoryRouter initialEntries={['/track']}>
          <App />
        </MemoryRouter>
      </StateProvider>,
    );

    await userEvent.click(await screen.findByRole('button', { name: 'Log an extra' }));
    // Still on the Track page — the inline control replaced the button in place.
    expect(screen.getByRole('button', { name: 'Log a meal' })).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveFocus();

    await userEvent.type(screen.getByLabelText('Name'), 'Red wine');
    await userEvent.type(screen.getByLabelText('Calories'), '125');
    await userEvent.click(screen.getByRole('button', { name: 'Add extra' }));

    await waitFor(() =>
      expect(apiMock.extras.add).toHaveBeenCalledWith(
        'test-token',
        'd1',
        expect.objectContaining({ name: 'Red wine', calories: 125 }),
      ),
    );
    // Collapses back to the button (Cancel-equivalent reset) without navigating.
    expect(await screen.findByRole('button', { name: 'Log an extra' })).toBeInTheDocument();
  });

  it('"Log an extra" creates today from templates when missing, then submits to the new day (scenario)', async () => {
    apiMock.days.list.mockResolvedValue({ days: [] });
    apiMock.days.create.mockResolvedValue(makeDay());
    apiMock.extras.add.mockResolvedValue(extrasMeal([extraIngredient({ calories: 150 })]));

    render(
      <StateProvider>
        <MemoryRouter initialEntries={['/track']}>
          <App />
        </MemoryRouter>
      </StateProvider>,
    );

    await userEvent.click(await screen.findByRole('button', { name: 'Log an extra' }));
    expect(screen.getByLabelText('Name')).toHaveFocus();

    await userEvent.type(screen.getByLabelText('Name'), 'Tortilla chips');
    await userEvent.type(screen.getByLabelText('Calories'), '150');
    await userEvent.click(screen.getByRole('button', { name: 'Add extra' }));

    await waitFor(() => expect(apiMock.days.create).toHaveBeenCalled());
    await waitFor(() =>
      expect(apiMock.extras.add).toHaveBeenCalledWith(
        'test-token',
        'd1',
        expect.objectContaining({ name: 'Tortilla chips', calories: 150 }),
      ),
    );
  });

  it('Cancel on the inline "Log an extra" control reverts to the button without submitting', async () => {
    apiMock.days.list.mockResolvedValue({ days: [makeDay()] });

    render(
      <StateProvider>
        <MemoryRouter initialEntries={['/track']}>
          <App />
        </MemoryRouter>
      </StateProvider>,
    );

    await userEvent.click(await screen.findByRole('button', { name: 'Log an extra' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.getByRole('button', { name: 'Log an extra' })).toBeInTheDocument();
    expect(apiMock.extras.add).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// #93 — looking Extras up in the nutrition database
// ---------------------------------------------------------------------------

const dbEntry = {
  id: '11111111-1111-7111-8111-111111111111',
  name: 'Chobani Greek Yogurt',
  servingAmount: 170,
  servingSizeUnit: 'gram' as const,
  servingsPerPackage: 1,
  addedByUserId: 'user_test',
  creationSource: 'manual' as const,
  fat: 0,
  carbs: 9,
  protein: 15,
  fiber: 2,
  calories: 120,
  addedByName: 'Adam',
  createdAt: now,
  updatedAt: now,
};

function dbExtraIngredient(overrides: Partial<Ingredient> = {}): Ingredient {
  return extraIngredient({
    id: 'e-db',
    name: 'Chobani Greek Yogurt',
    weight: 170,
    calories: 120,
    carbs: 9,
    protein: 15,
    fiber: 2,
    micronutrients: [{ name: 'Calcium', amount: 187, unit: 'milligram' }],
    sourceDatabaseIngredientId: dbEntry.id,
    ...overrides,
  });
}

async function openExtrasDatabaseSearch() {
  await userEvent.click(screen.getByRole('button', { name: '+ Add extra' }));
  await userEvent.click(screen.getByRole('tab', { name: 'Search database' }));
}

describe('extras nutrition database lookup (#93)', () => {
  afterEach(() => {
    cleanup();
    apiMock.days.list.mockReset();
    apiMock.days.list.mockResolvedValue({ days: [] });
    apiMock.days.get.mockReset();
    apiMock.days.create.mockReset();
    apiMock.extras.add.mockReset();
    apiMock.extras.addFromDatabase.mockReset();
    apiMock.ingredients.upsert.mockReset();
    apiMock.ingredients.delete.mockReset();
    apiMock.nutritionDatabase.search.mockReset();
    apiMock.nutritionDatabase.search.mockResolvedValue({ results: [], total: 0 });
  });

  it('adds a searched entry to the day as one serving (R3/R4, scenario: add from the database)', async () => {
    apiMock.days.get.mockResolvedValue(makeDay());
    apiMock.nutritionDatabase.search.mockResolvedValue({ results: [dbEntry], total: 1 });
    apiMock.extras.addFromDatabase.mockResolvedValue(extrasMeal([dbExtraIngredient()]));

    renderApp('/track/day/d1');
    await screen.findByText('Extras');
    await openExtrasDatabaseSearch();
    await userEvent.type(
      screen.getByLabelText(/available for searching|Search ingredients/),
      'cho',
    );

    expect(await screen.findByText('Chobani Greek Yogurt')).toBeInTheDocument();
    // Servings / 1 is prefilled, so Add works on the first tap (R4).
    expect(screen.getByLabelText('Add by')).toHaveValue('servings');
    expect(screen.getByLabelText('# of servings')).toHaveValue('1');
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() =>
      expect(apiMock.extras.addFromDatabase).toHaveBeenCalledWith('test-token', 'd1', {
        databaseIngredientId: dbEntry.id,
        mode: 'servings',
        amount: 1,
      }),
    );
    // The bucket the server returned is merged in and its totals counted (R3).
    expect(await screen.findAllByText('Chobani Greek Yogurt')).not.toHaveLength(0);
    expect(screen.getByText(/120 \/ 2000/)).toBeInTheDocument();
    // Extras still do not count toward meal adherence (R13).
    expect(screen.getByText('Meals 0 / 0')).toBeInTheDocument();
  });

  it('creates the Extras bucket when the day has none yet (R7)', async () => {
    // The day starts with no Extras meal at all — the bucket arrives with the
    // server's response rather than existing in local state first.
    apiMock.days.get.mockResolvedValue(makeDay({ meals: [] }));
    apiMock.nutritionDatabase.search.mockResolvedValue({ results: [dbEntry], total: 1 });
    apiMock.extras.addFromDatabase.mockResolvedValue(extrasMeal([dbExtraIngredient()]));

    renderApp('/track/day/d1');
    await screen.findByText('Extras');
    await openExtrasDatabaseSearch();
    await userEvent.type(
      screen.getByLabelText(/available for searching|Search ingredients/),
      'cho',
    );
    await screen.findByText('Chobani Greek Yogurt');
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => expect(apiMock.extras.addFromDatabase).toHaveBeenCalled());
    expect(await screen.findAllByText('Chobani Greek Yogurt')).not.toHaveLength(0);
  });

  it('never offers label scanning or entry creation from Extras (R11 — the non-goal)', async () => {
    apiMock.days.get.mockResolvedValue(makeDay());
    apiMock.nutritionDatabase.search.mockResolvedValue({ results: [dbEntry], total: 1 });

    renderApp('/track/day/d1');
    await screen.findByText('Extras');
    await openExtrasDatabaseSearch();
    await userEvent.type(
      screen.getByLabelText(/available for searching|Search ingredients/),
      'cho',
    );
    await screen.findByText('Chobani Greek Yogurt');

    expect(screen.queryByRole('button', { name: 'Scan to add' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add an ingredient' })).not.toBeInTheDocument();
  });

  it('offers no lookup on a past day (R12)', async () => {
    apiMock.days.get.mockResolvedValue(
      makeDay({ date: YESTERDAY, meals: [extrasMeal([extraIngredient()])] }),
    );

    renderApp('/track/day/d1');
    await screen.findByText('Extras');

    expect(screen.queryByRole('button', { name: '+ Add extra' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Search database' })).not.toBeInTheDocument();
  });

  it("preserves a database extra's label details when its calories are edited (R14)", async () => {
    const existing = dbExtraIngredient();
    apiMock.days.get.mockResolvedValue(makeDay({ meals: [extrasMeal([existing])] }));
    apiMock.ingredients.upsert.mockResolvedValue({ ...existing, calories: 130 });

    renderApp('/track/day/d1');
    await screen.findByText('Extras');
    await userEvent.click(screen.getByText('Chobani Greek Yogurt'));

    const calories = screen.getByLabelText('Calories');
    await userEvent.clear(calories);
    await userEvent.type(calories, '130');
    await userEvent.click(screen.getByRole('button', { name: 'Save extra' }));

    await waitFor(() => expect(apiMock.ingredients.upsert).toHaveBeenCalled());
    const payload = apiMock.ingredients.upsert.mock.calls[0][3];
    expect(payload.calories).toBe(130);
    // The fields the quick-add form cannot see survive the edit.
    expect(payload.weight).toBe(170);
    expect(payload.fiber).toBe(2);
    expect(payload.micronutrients).toEqual([{ name: 'Calcium', amount: 187, unit: 'milligram' }]);
    expect(payload.sourceDatabaseIngredientId).toBe(dbEntry.id);
  });

  it("creates today's day before logging from the Track quick action (R10)", async () => {
    apiMock.days.list.mockResolvedValue({ days: [] });
    apiMock.days.create.mockResolvedValue(makeDay({ meals: [] }));
    apiMock.nutritionDatabase.search.mockResolvedValue({ results: [dbEntry], total: 1 });
    apiMock.extras.addFromDatabase.mockResolvedValue(extrasMeal([dbExtraIngredient()]));

    renderApp('/track');
    await screen.findByRole('button', { name: 'Log an extra' });
    await userEvent.click(screen.getByRole('button', { name: 'Log an extra' }));
    await userEvent.click(screen.getByRole('tab', { name: 'Search database' }));
    await userEvent.type(
      screen.getByLabelText(/available for searching|Search ingredients/),
      'cho',
    );
    await screen.findByText('Chobani Greek Yogurt');
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => expect(apiMock.extras.addFromDatabase).toHaveBeenCalled());
    // The day is created first, and the extra is logged against its id.
    expect(apiMock.days.create).toHaveBeenCalled();
    expect(apiMock.extras.addFromDatabase).toHaveBeenCalledWith(
      'test-token',
      'd1',
      expect.objectContaining({ databaseIngredientId: dbEntry.id }),
    );
  });
});
