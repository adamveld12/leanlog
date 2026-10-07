import { fireEvent, screen } from 'expo-router/testing-library';
import { saveBodyFatResult } from '../db/repos/body';
import { setMeasurements, setWeight } from '../db/repos/days';
import { exportAll } from '../db/repos/exportImport';
import { renderApp } from '../test/renderApp';
import { testDb } from '../test/testDb';
import { seedOnboarded } from '../test/seed';

const TODAY = '2026-10-06';

describe('Body tab', () => {
  it('logs today’s weight', async () => {
    const db = testDb();
    await seedOnboarded(db);
    await renderApp('/body');
    await fireEvent.changeText(await screen.findByLabelText('Weight today'), '181');
    await fireEvent.press(screen.getByRole('button', { name: 'Save weight' }));
    await screen.findByText('Saved');
    expect((await exportAll(db)).days.find((d) => d.date === TODAY)?.weightLbs).toBe(181);
  });

  it('says what is missing until each 7-day window has 2 weigh-ins (#68 rule)', async () => {
    const db = testDb();
    await seedOnboarded(db);
    await setWeight(db, TODAY, TODAY, { weightLbs: 180, source: 'manual', at: 'a' });
    await renderApp('/body');
    expect(
      await screen.findByText(/at least 2 weigh-ins in each of the last two weeks/),
    ).toBeTruthy();
  });

  it('shows v-taper against the 1.6 target and the gap (50 / 32 → 1.56)', async () => {
    const db = testDb();
    await seedOnboarded(db);
    await setMeasurements(db, TODAY, TODAY, { shoulderIn: 50, waistIn: 32 });
    await renderApp('/body');
    expect(await screen.findByText('Shoulder ÷ waist: 1.56')).toBeTruthy();
    expect(screen.getByText('0.04 to go to reach 1.6')).toBeTruthy();
  });

  it('prompts for shoulder and waist when there is no v-taper yet', async () => {
    const db = testDb();
    await seedOnboarded(db);
    await renderApp('/body');
    expect(await screen.findByText('Log shoulder and waist to see your v-taper.')).toBeTruthy();
  });

  it('saves measurements for today and shows the body fat result', async () => {
    const db = testDb();
    await seedOnboarded(db);
    await saveBodyFatResult(db, TODAY, { method: 'navy', pct: 17, inputs: {} });
    await renderApp('/body');
    expect(await screen.findByText('Latest: 17% (Navy tape)')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Waist'), '34');
    await fireEvent.press(screen.getByRole('button', { name: 'Save measurements' }));
    await screen.findByText('Saved');
    expect((await exportAll(db)).days.find((d) => d.date === TODAY)?.waistIn).toBe(34);
  });
});
