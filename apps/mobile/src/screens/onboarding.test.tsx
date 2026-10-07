import { fireEvent, screen } from 'expo-router/testing-library';
import { exportAll } from '../db/repos/exportImport';
import { renderApp } from '../test/renderApp';
import { testDb } from '../test/testDb';

async function fillProfile() {
  await fireEvent.changeText(await screen.findByLabelText('Weight'), '180');
  await fireEvent.changeText(screen.getByLabelText('Height'), '72');
  await fireEvent.press(screen.getByRole('radio', { name: 'Male' }));
  await fireEvent.changeText(screen.getByLabelText('Birth date'), '1991-01-01');
}

const nextDisabled = () =>
  screen.getByRole('button', { name: 'Next' }).props.accessibilityState.disabled;

describe('Onboarding (first launch)', () => {
  it('opens on a fresh install and blocks Next until the required fields are valid', async () => {
    await renderApp('/');
    expect(await screen.findByText('Welcome to LeanLog')).toBeTruthy();
    expect(nextDisabled()).toBe(true);

    await fireEvent.changeText(screen.getByLabelText('Weight'), '180');
    await fireEvent.changeText(screen.getByLabelText('Height'), '72');
    await fireEvent.press(screen.getByRole('radio', { name: 'Male' }));
    expect(nextDisabled()).toBe(true); // birth date still missing

    await fireEvent.changeText(screen.getByLabelText('Birth date'), 'soon');
    expect(nextDisabled()).toBe(true); // not a date

    await fireEvent.changeText(screen.getByLabelText('Birth date'), '1991-01-01');
    expect(nextDisabled()).toBe(false);
  });

  it('can skip the body fat calculator: saves the profile, logs the weight, uses the bodyweight target', async () => {
    const db = testDb();
    await renderApp('/');
    await fillProfile();
    await fireEvent.press(screen.getByRole('button', { name: 'Next' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Skip for now' }));

    expect(await screen.findByText('0 / 2,700 kcal')).toBeTruthy();
    const saved = await exportAll(db);
    expect(saved.profile).toMatchObject({
      sex: 'male',
      heightIn: 72,
      birthDate: '1991-01-01',
      onboardingWeightLbs: 180,
    });
    expect(saved.days.find((d) => d.date === '2026-10-06')).toMatchObject({
      weightLbs: 180,
      weightSource: 'manual',
    });
  });

  it('offers the calculator, pre-filled, and finishing it switches today to Katch', async () => {
    const db = testDb();
    await renderApp('/');
    await fillProfile();
    await fireEvent.press(screen.getByRole('button', { name: 'Next' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Calculate body fat' }));
    expect((await screen.findByLabelText('Height')).props.value).toBe('72');
    await fireEvent.changeText(screen.getByLabelText('Neck'), '15');
    await fireEvent.changeText(screen.getByLabelText('Waist'), '34');
    await fireEvent.press(await screen.findByRole('button', { name: 'Save 17%' }));

    expect(await screen.findByText('Katch · BF 17% · No activity')).toBeTruthy();
    const saved = await exportAll(db);
    expect(saved.profile).toMatchObject({ sex: 'male', heightIn: 72, birthDate: '1991-01-01' });
    expect(saved.bodyFatResults).toEqual([expect.objectContaining({ pct: 17, method: 'navy' })]);
  });
});
