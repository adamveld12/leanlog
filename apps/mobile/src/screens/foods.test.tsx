import { router } from 'expo-router';
import { act, fireEvent, screen } from 'expo-router/testing-library';
import { addMeal } from '../db/repos/meals';
import { exportAll } from '../db/repos/exportImport';
import { createSavedFood } from '../db/repos/savedFoods';
import { renderApp } from '../test/renderApp';
import { testDb } from '../test/testDb';
import { seedOnboarded } from '../test/seed';

const TODAY = '2026-10-06';

describe('Foods', () => {
  it('creates a saved food from the Foods tab', async () => {
    await seedOnboarded(testDb());
    await renderApp('/foods');
    await fireEvent.press(await screen.findByRole('button', { name: 'New food' }));
    await fireEvent.changeText(await screen.findByLabelText('Food name'), 'Oats');
    await fireEvent.changeText(screen.getByLabelText('Calories'), '380');
    await fireEvent.press(screen.getByRole('button', { name: 'Save food' }));
    expect(await screen.findByRole('button', { name: 'Oats · 380 kcal / 100 g' })).toBeTruthy();
  });

  it('saves a manual entry to the foods list in one tap and logs it to the meal', async () => {
    const db = testDb();
    await seedOnboarded(db);
    await addMeal(db, TODAY, TODAY, 'Lunch');
    await renderApp('/');
    await fireEvent.press(await screen.findByRole('button', { name: 'Add food' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Add manually' }));
    await fireEvent.changeText(await screen.findByLabelText('Food name'), 'Rice');
    await fireEvent.changeText(screen.getByLabelText('Grams'), '200');
    await fireEvent.changeText(screen.getByLabelText('Calories'), '260');
    await fireEvent.press(screen.getByRole('radio', { name: 'Yes' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Add to meal' }));
    expect(await screen.findByText('Rice · 200 g')).toBeTruthy();
    expect(
      (await exportAll(db)).savedFoods.map((f) => [f.name, f.referenceGrams, f.calories]),
    ).toEqual([['Rice', 200, 260]]);
  });

  it('keeps logged ingredients unchanged when a saved food is edited (R8)', async () => {
    const db = testDb();
    await seedOnboarded(db);
    const meal = await addMeal(db, TODAY, TODAY, 'Breakfast');
    const food = await createSavedFood(db, {
      name: 'Oats',
      referenceGrams: 100,
      calories: 380,
      fat: 7,
      saturatedFat: 1.2,
      carbs: 67,
      fiber: 10,
      protein: 13,
    });
    await renderApp(`/meal/${meal.id}`);
    await fireEvent.press(await screen.findByRole('button', { name: 'Add from saved foods' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Oats' }));
    await fireEvent.changeText(await screen.findByLabelText('Grams'), '50');
    await fireEvent.press(screen.getByRole('button', { name: 'Add to meal' }));
    expect(await screen.findByText('Oats · 50 g')).toBeTruthy();

    await act(async () => router.push(`/food/${food.id}`));
    await fireEvent.changeText(await screen.findByLabelText('Calories'), '400');
    await fireEvent.press(screen.getByRole('button', { name: 'Save food' }));

    // Saving returns to the meal, whose logged ingredient is still the 190 kcal copy.
    expect(await screen.findByText('Oats · 50 g')).toBeTruthy();
    expect(screen.getByText('190 kcal')).toBeTruthy();
  });
});
