import { fireEvent, screen } from 'expo-router/testing-library';
import { ensureSeeded } from '../db/repos/base';
import { addMeal } from '../db/repos/meals';
import { createSavedFood } from '../db/repos/savedFoods';
import { testDb } from '../test/testDb';
import { renderApp } from '../test/renderApp';

const TODAY = '2026-10-06';
const YESTERDAY = '2026-10-05';

const oats = {
  name: 'Oats',
  referenceGrams: 100,
  calories: 380,
  fat: 7,
  saturatedFat: 1.2,
  carbs: 67,
  fiber: 10,
  protein: 13,
};

describe('Today', () => {
  it('opens on today with the bodyweight-fallback target and a body fat prompt (AE5)', async () => {
    await renderApp('/');
    expect(await screen.findByText('Tue, Oct 6')).toBeTruthy();
    expect(screen.getByText('0 / 2,700 kcal')).toBeTruthy();
    expect(screen.getByText(/Calculate your body fat/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Calculate body fat' })).toBeTruthy();
  });

  it('adds a named meal', async () => {
    await renderApp('/');
    await fireEvent.changeText(await screen.findByLabelText('Meal name'), 'Lunch');
    await fireEvent.press(screen.getByRole('button', { name: 'Add meal' }));
    expect(await screen.findByText('Lunch')).toBeTruthy();
  });

  it('shows past days read-only: no add or edit controls', async () => {
    const db = testDb();
    await ensureSeeded(db);
    await addMeal(db, YESTERDAY, YESTERDAY, 'Dinner');
    await renderApp('/');
    await fireEvent.press(await screen.findByRole('button', { name: 'Previous day' }));
    expect(await screen.findByText('Mon, Oct 5')).toBeTruthy();
    expect(screen.getByText('Dinner')).toBeTruthy();
    expect(screen.getByText(/locked/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Add meal' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Add food' })).toBeNull();
    // Can't page into the future either.
    await fireEvent.press(screen.getByRole('button', { name: 'Next day' }));
    expect(await screen.findByText('Tue, Oct 6')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Next day' }).props.accessibilityState).toMatchObject(
      {
        disabled: true,
      },
    );
  });

  it('adds 50 g of a saved food to a meal as a scaled copy (190 kcal)', async () => {
    const db = testDb();
    await ensureSeeded(db);
    await createSavedFood(db, oats);
    await addMeal(db, TODAY, TODAY, 'Breakfast');
    await renderApp('/');
    await fireEvent.press(await screen.findByRole('button', { name: 'Add food' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Add from saved foods' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Oats' }));
    await fireEvent.changeText(await screen.findByLabelText('Grams'), '50');
    expect(await screen.findByText('190 kcal')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Add to meal' }));
    expect(await screen.findByText('Oats · 50 g')).toBeTruthy();
    expect(screen.getByText('190 kcal')).toBeTruthy();
  });
});
