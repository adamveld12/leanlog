import { fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { Linking } from 'react-native';
import { updateSettings } from '../db/repos/base';
import { setWeight } from '../db/repos/days';
import { exportAll } from '../db/repos/exportImport';
import { FakeHealthConnect } from '../test/fakeHealthConnect';
import { setTestHc } from '../test/hcHolder';
import { renderApp } from '../test/renderApp';
import { seedOnboarded } from '../test/seed';
import { testDb } from '../test/testDb';

const OWN = 'app.leanlog.mobile';
const TODAY = '2026-10-06';

const installHc = (options: Partial<ConstructorParameters<typeof FakeHealthConnect>[0]> = {}) => {
  const hc = new FakeHealthConnect({ ownPackage: OWN, ...options });
  setTestHc(hc);
  return hc;
};

describe('Me › Health Connect', () => {
  it('says so when Health Connect is not on the device and links to the Play Store', async () => {
    installHc({ status: 1 });
    await seedOnboarded(testDb());
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await renderApp('/me');
    expect(await screen.findByText(/Health Connect isn't available on this device/)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Get Health Connect' }));
    expect(open).toHaveBeenCalledWith(
      expect.stringContaining('com.google.android.apps.healthdata'),
    );
  });

  it('asks for the update when the provider is out of date', async () => {
    installHc({ status: 2 });
    await seedOnboarded(testDb());
    await renderApp('/me');
    expect(await screen.findByText(/needs an update/)).toBeTruthy();
  });

  it('connects: asks for permissions and shows Connected', async () => {
    const hc = installHc();
    const db = testDb();
    await seedOnboarded(db);
    await renderApp('/me');
    await fireEvent.press(await screen.findByRole('button', { name: 'Connect Health Connect' }));
    expect(await screen.findByText('Connected')).toBeTruthy();
    expect(hc.granted.length).toBeGreaterThan(0);
    expect((await exportAll(db)).settings.hcEnabled).toBe(true);
  });

  it('imports a smart-scale weight on connect', async () => {
    const hc = installHc();
    hc.addExternal(
      {
        recordType: 'Weight',
        time: new Date(2026, 9, 6, 7, 2).toISOString(),
        weight: { value: 181.2, unit: 'pounds' },
        metadata: { clientRecordId: 'scale-1' },
      },
      'com.scale.app',
    );
    const db = testDb();
    await seedOnboarded(db);
    await renderApp('/me');
    await fireEvent.press(await screen.findByRole('button', { name: 'Connect Health Connect' }));
    await screen.findByText('Connected');
    await fireEvent.press(screen.getByLabelText(/^Body, tab/));
    // The import runs in the background after connecting.
    await waitFor(() => expect(screen.getByLabelText('Weight today').props.value).toBe('181.2'));
  });

  it('keeps everything working when permission is denied', async () => {
    installHc({ grant: () => [] });
    const db = testDb();
    await seedOnboarded(db);
    await renderApp('/me');
    await fireEvent.press(await screen.findByRole('button', { name: 'Connect Health Connect' }));
    expect(await screen.findByText(/permission was not granted/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Connect Health Connect' })).toBeTruthy();
    expect((await exportAll(db)).settings.hcEnabled).toBe(false);
  });

  it('shows what is still waiting to sync, and can open Health Connect to manage access', async () => {
    const hc = installHc();
    hc.failInserts = 99;
    const db = testDb();
    await seedOnboarded(db);
    await hc.requestPermission([
      { accessType: 'write', recordType: 'Weight' },
      { accessType: 'read', recordType: 'Weight' },
    ]);
    await updateSettings(db, { hcEnabled: true });
    await setWeight(db, TODAY, TODAY, {
      weightLbs: 181,
      source: 'manual',
      at: new Date().toISOString(),
    });
    await renderApp('/me');
    expect(await screen.findByText('Connected')).toBeTruthy();
    // The weigh-in, plus the Height queued when the seeded profile got its height.
    expect(await screen.findByText('2 waiting to sync')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Manage in Health Connect' }));
    expect(hc.settingsOpened).toBe(1);
  });

  it('can stop syncing; data already in Health Connect is managed there', async () => {
    const hc = installHc();
    const db = testDb();
    await seedOnboarded(db);
    await hc.requestPermission([{ accessType: 'write', recordType: 'Weight' }]);
    await updateSettings(db, { hcEnabled: true });
    await renderApp('/me');
    await fireEvent.press(await screen.findByRole('button', { name: 'Stop syncing' }));
    expect(await screen.findByRole('button', { name: 'Connect Health Connect' })).toBeTruthy();
    expect((await exportAll(db)).settings.hcEnabled).toBe(false);
  });

  it('explains why each permission is asked for', async () => {
    installHc();
    await seedOnboarded(testDb());
    await renderApp('/me');
    await fireEvent.press(await screen.findByRole('button', { name: 'Why Leanlog asks for this' }));
    expect(await screen.findByText(/Smart-scale weight/)).toBeTruthy();
    expect(screen.getByText(/Meals, weigh-ins and body fat/)).toBeTruthy();
    expect(screen.getByText(/stays on this phone/i)).toBeTruthy();
  });
});
