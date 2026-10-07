import { fireEvent, screen } from 'expo-router/testing-library';
import { saveBodyFatResult } from '../db/repos/body';
import { setWeight } from '../db/repos/days';
import { exportAll } from '../db/repos/exportImport';
import { updateProfile } from '../db/repos/profile';
import { renderApp } from '../test/renderApp';
import { testDb } from '../test/testDb';
import { seedOnboarded } from '../test/seed';

const TODAY = '2026-10-06';

// 180 lb at 15% body fat, Moderate activity, 30F / 40C / 30P.
async function seedKatch() {
  const db = testDb();
  await seedOnboarded(db);
  await setWeight(db, TODAY, TODAY, { weightLbs: 180, source: 'manual', at: `${TODAY}T07:00:00Z` });
  await saveBodyFatResult(db, TODAY, { method: 'navy', pct: 15, inputs: {} });
  await updateProfile(db, TODAY, { activityLevel: 'moderate' });
  return db;
}

describe('Me › targets', () => {
  it('shows the live breakdown and recalculates as the delta changes (AE3)', async () => {
    await seedKatch();
    await renderApp('/me');
    expect(await screen.findByText('= 2,897 kcal')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Calorie delta'), '-300');
    expect(await screen.findByText('= 2,597 kcal')).toBeTruthy();
    expect(screen.getByText('+ activity 1,028 → −300')).toBeTruthy();
  });

  it('AE4: shows the lowest allowed delta and blocks anything below it', async () => {
    const db = await seedKatch();
    await renderApp('/me');
    expect(await screen.findByText('Lowest allowed delta: −1,775 kcal')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Calorie delta'), '-1800');
    expect(await screen.findByText(/can't go below −1,775/)).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Save targets' }).props.accessibilityState,
    ).toMatchObject({
      disabled: true,
    });
    await fireEvent.changeText(screen.getByLabelText('Calorie delta'), '-1775');
    await fireEvent.press(screen.getByRole('button', { name: 'Save targets' }));
    await screen.findByText('Saved');
    expect((await exportAll(db)).profile.calorieDelta).toBe(-1775);
  });

  it('requires the macro split to add up to 100', async () => {
    await seedKatch();
    await renderApp('/me');
    await fireEvent.changeText(await screen.findByLabelText('Fat %'), '35');
    expect(await screen.findByText('Macro split must add up to 100 (now 105).')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Save targets' }).props.accessibilityState,
    ).toMatchObject({
      disabled: true,
    });
  });

  it('applies a new activity level to today when saved (AE2)', async () => {
    const db = testDb();
    await seedOnboarded(db);
    await setWeight(db, TODAY, TODAY, { weightLbs: 180, source: 'manual', at: 'a' });
    await saveBodyFatResult(db, TODAY, { method: 'navy', pct: 15, inputs: {} });
    await renderApp('/me');
    expect(await screen.findByText('= 1,869 kcal')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Activity: None' }));
    await fireEvent.press(await screen.findByRole('menuitem', { name: 'Moderate' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Save targets' }));
    await screen.findByText('Saved');
    expect((await exportAll(db)).days.find((d) => d.date === TODAY)?.targetCalories).toBe(2897);
  });
});

describe('Me › units', () => {
  it('is display-only: 180.78 lb reads 180.8 lb, then 82 kg, and storage is unchanged', async () => {
    const db = testDb();
    await seedOnboarded(db);
    await setWeight(db, TODAY, TODAY, { weightLbs: 180.78, source: 'manual', at: 'a' });
    await renderApp('/body');
    expect((await screen.findByLabelText('Weight today')).props.value).toBe('180.8');

    await fireEvent.press(screen.getByLabelText(/^Me, tab/));
    await fireEvent.press(await screen.findByRole('radio', { name: 'Metric (kg, cm)' }));
    await fireEvent.press(screen.getByLabelText(/^Body, tab/));
    expect((await screen.findByLabelText('Weight today')).props.value).toBe('82');
    expect((await exportAll(db)).days.find((d) => d.date === TODAY)?.weightLbs).toBe(180.78);
  });
});
