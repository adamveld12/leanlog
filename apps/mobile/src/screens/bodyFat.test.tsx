import { fireEvent, screen } from 'expo-router/testing-library';
import { ensureSeeded } from '../db/repos/base';
import { exportAll } from '../db/repos/exportImport';
import { setWeight } from '../db/repos/days';
import { updateProfile } from '../db/repos/profile';
import { renderApp } from '../test/renderApp';
import { testDb } from '../test/testDb';

const TODAY = '2026-10-06';

async function seedMale() {
  const db = testDb();
  await ensureSeeded(db);
  await setWeight(db, TODAY, TODAY, { weightLbs: 180, source: 'manual', at: `${TODAY}T07:00:00Z` });
  await updateProfile(db, TODAY, { sex: 'male', heightIn: 72, birthDate: '1991-01-01' });
  return db;
}

describe('Body fat calculator', () => {
  it('AE6: Navy tape 72 / 15 / 34 → 17%, saved as today’s body fat and Katch driver', async () => {
    const db = await seedMale();
    await renderApp('/body-fat');
    // Pre-filled from the profile; every input stays editable.
    expect((await screen.findByLabelText('Height')).props.value).toBe('72');
    await fireEvent.changeText(screen.getByLabelText('Neck'), '15');
    await fireEvent.changeText(screen.getByLabelText('Waist'), '34');
    expect(await screen.findByText('Estimate: 17%')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Save 17%' }));

    await screen.findByLabelText(/^Today, tab/);
    const saved = await exportAll(db);
    expect(saved.bodyFatResults).toEqual([
      expect.objectContaining({ date: TODAY, pct: 17, method: 'navy' }),
    ]);
    // The calculator's measurements are saved to today (R26) and Katch now drives targets.
    expect(saved.days.find((d) => d.date === TODAY)).toMatchObject({
      neckIn: 15,
      waistIn: 34,
      basis: 'katch',
    });
  });

  it('AE7: skinfold chest 8 + abdomen 12 + thigh 10 at age 35 → 10%', async () => {
    await seedMale();
    await renderApp('/body-fat');
    await fireEvent.press(await screen.findByRole('radio', { name: 'Skinfold' }));
    await fireEvent.changeText(await screen.findByLabelText('Chest'), '8');
    await fireEvent.changeText(screen.getByLabelText('Abdomen'), '12');
    await fireEvent.changeText(screen.getByLabelText('Thigh'), '10');
    expect(await screen.findByText('Estimate: 10%')).toBeTruthy();
  });

  it('asks women for hip; men never see it', async () => {
    const db = await seedMale();
    await renderApp('/body-fat');
    expect(await screen.findByLabelText('Neck')).toBeTruthy();
    expect(screen.queryByLabelText('Hip')).toBeNull();
    await fireEvent.press(screen.getByRole('radio', { name: 'Female' }));
    expect(await screen.findByLabelText('Hip')).toBeTruthy();
    // Changing sex in the calculator is saved back to the profile (R26) on save.
    await fireEvent.changeText(screen.getByLabelText('Neck'), '13');
    await fireEvent.changeText(screen.getByLabelText('Waist'), '30');
    await fireEvent.changeText(screen.getByLabelText('Hip'), '40');
    await fireEvent.changeText(screen.getByLabelText('Height'), '65');
    expect(await screen.findByText('Estimate: 31%')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Save 31%' }));
    await screen.findByLabelText(/^Today, tab/);
    expect((await exportAll(db)).profile).toMatchObject({ sex: 'female', heightIn: 65 });
  });

  it('does not offer to save a result outside 5–50%', async () => {
    await seedMale();
    await renderApp('/body-fat');
    await fireEvent.changeText(await screen.findByLabelText('Neck'), '20');
    await fireEvent.changeText(screen.getByLabelText('Waist'), '21');
    expect(await screen.findByText(/outside the 5–50% range/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Save \d+%$/ })).toBeNull();
  });
});
