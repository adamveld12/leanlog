import { fireEvent, screen } from 'expo-router/testing-library';
import exportV1 from '../backup/__fixtures__/export-v1.json';
import { updateSettings } from '../db/repos/base';
import { exportAll } from '../db/repos/exportImport';
import { createSavedFood } from '../db/repos/savedFoods';
import { configureAnalytics } from '../telemetry/analytics';
import { testBackupIo } from '../test/backupIoHolder';
import { instances } from '../test/posthogMock';
import { renderApp } from '../test/renderApp';
import { seedOnboarded } from '../test/seed';
import { testDb } from '../test/testDb';

const events = () => instances.flatMap((i) => i.capture.mock.calls as [string, unknown][]);
const named = (name: string) =>
  events()
    .filter(([event]) => event === name)
    .map(([, props]) => props);

describe('analytics toggle', () => {
  it('is not offered when no PostHog key is configured (the shipped default)', async () => {
    await seedOnboarded(testDb());
    await renderApp('/me');
    await screen.findByRole('radio', { name: 'Imperial (lb, in)' });
    expect(screen.queryByLabelText('Anonymous analytics')).toBeNull();
    expect(instances).toHaveLength(0);
  });

  it('turns on and off, persisting the choice and telling PostHog before opting out', async () => {
    configureAnalytics({ key: 'phc_test', host: 'https://us.i.posthog.com' });
    const db = testDb();
    await seedOnboarded(db);
    await renderApp('/me');
    expect(instances).toHaveLength(0);

    await fireEvent.press(await screen.findByRole('radio', { name: 'On' }));
    await screen.findByText('Saved');
    expect(instances).toHaveLength(1);
    expect((await exportAll(db)).settings.analyticsOptIn).toBe(true);
    expect(named('analytics_opt_in_changed')).toEqual([{ enabled: true }]);

    await fireEvent.press(screen.getByRole('radio', { name: 'Off' }));
    await screen.findByText('Saved');
    const [client] = instances;
    expect(named('analytics_opt_in_changed')).toEqual([{ enabled: true }, { enabled: false }]);
    expect(client.optOut).toHaveBeenCalled();
    expect((await exportAll(db)).settings.analyticsOptIn).toBe(false);
  });

  it('starts sending when the app opens with the choice already on', async () => {
    configureAnalytics({ key: 'phc_test' });
    const db = testDb();
    await seedOnboarded(db);
    await updateSettings(db, { analyticsOptIn: true });
    await renderApp('/');
    await screen.findByLabelText(/^Today, tab/);
    expect(instances).toHaveLength(1);
  });

  it('stays silent for someone who has not opted in', async () => {
    configureAnalytics({ key: 'phc_test' });
    await seedOnboarded(testDb());
    await renderApp('/');
    await screen.findByLabelText(/^Today, tab/);
    expect(instances).toHaveLength(0);
  });
});

describe('analytics events (opted in)', () => {
  async function optedIn() {
    // Opted in the way a user would be: a key is configured and the stored choice is on,
    // so the app itself starts the client when it opens.
    configureAnalytics({ key: 'phc_test' });
    const db = testDb();
    await seedOnboarded(db);
    await updateSettings(db, { analyticsOptIn: true });
    return db;
  }

  it('records screen views', async () => {
    await optedIn();
    await renderApp('/');
    await fireEvent.press(await screen.findByLabelText(/^Body, tab/));
    await screen.findByLabelText('Weight today');
    expect(named('$screen')).toEqual(expect.arrayContaining([{ $screen_name: '/body' }]));
  });

  it('weight and measurements', async () => {
    await optedIn();
    await renderApp('/body');
    await fireEvent.changeText(await screen.findByLabelText('Weight today'), '181');
    await fireEvent.press(screen.getByRole('button', { name: 'Save weight' }));
    await fireEvent.changeText(screen.getByLabelText('Waist'), '34');
    await fireEvent.changeText(screen.getByLabelText('Neck'), '15');
    await fireEvent.press(screen.getByRole('button', { name: 'Save measurements' }));
    await screen.findByText('Saved');
    expect(named('weight_logged')).toEqual([{ source: 'manual' }]);
    expect(named('measurement_logged')).toEqual([{ sites: 2 }]);
  });

  it('meals, saved foods and ingredients', async () => {
    const db = await optedIn();
    await createSavedFood(db, {
      name: 'Oats',
      referenceGrams: 100,
      calories: 380,
      fat: 7,
      saturatedFat: 1.2,
      carbs: 67,
      fiber: 10,
      protein: 13,
    });
    await renderApp('/');
    await fireEvent.changeText(await screen.findByLabelText('Meal name'), 'Breakfast');
    await fireEvent.press(screen.getByRole('button', { name: 'Add meal' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Add food' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Add from saved foods' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Oats' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Add to meal' }));
    await screen.findByText(/Oats · 100 g/);
    expect(named('meal_created')).toHaveLength(1);
    expect(named('ingredient_added')).toEqual([{ source: 'saved_food' }]);

    await fireEvent.press(screen.getByRole('button', { name: 'Add manually' }));
    await fireEvent.changeText(await screen.findByLabelText('Food name'), 'Rice');
    await fireEvent.changeText(screen.getByLabelText('Grams'), '200');
    await fireEvent.changeText(screen.getByLabelText('Calories'), '260');
    await fireEvent.press(screen.getByRole('radio', { name: 'Yes' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Add to meal' }));
    await screen.findByText('Rice · 200 g');
    expect(named('saved_food_created')).toEqual([{ from: 'entry' }]);
    expect(named('ingredient_added')).toEqual([{ source: 'saved_food' }, { source: 'manual' }]);
  });

  it('profile target changes, units and body fat', async () => {
    await optedIn();
    await renderApp('/me');
    await fireEvent.press(await screen.findByRole('button', { name: 'Activity: None' }));
    await fireEvent.press(await screen.findByRole('menuitem', { name: 'Moderate' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Save targets' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Metric (kg, cm)' }));
    await screen.findByText('Saved');
    expect(named('profile_targets_changed')).toEqual(
      expect.arrayContaining([{ field: 'activity' }]),
    );
    expect(named('units_changed')).toEqual([{ to: 'metric' }]);
  });

  it('export and import carry only counts', async () => {
    await optedIn();
    const io = testBackupIo();
    await renderApp('/me');
    await fireEvent.press(await screen.findByRole('button', { name: 'Export data' }));
    await screen.findByText(/^Exported /);
    expect(named('export_completed')).toEqual([
      expect.objectContaining({ days: expect.any(Number), meals: expect.any(Number) }),
    ]);

    io.picked = { name: 'b.json', contents: JSON.stringify(exportV1) };
    await fireEvent.press(screen.getByRole('button', { name: 'Import data' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Replace all data' }));
    await screen.findByText('Imported b.json');
    expect(named('import_completed')).toEqual([
      { days: 14, meals: 3, ingredients: 4, savedFoods: 2, bodyFatResults: 1 },
    ]);
  });
});

describe('error capture', () => {
  it('logs a failed export locally and reports it when opted in', async () => {
    configureAnalytics({ key: 'phc_test' });
    const db = testDb();
    await seedOnboarded(db);
    await updateSettings(db, { analyticsOptIn: true });
    testBackupIo().failShare = new Error('share sheet crashed');
    await renderApp('/me');
    await fireEvent.press(await screen.findByRole('button', { name: 'Export data' }));
    await screen.findByText('share sheet crashed');
    const log = (await exportAll(db)).errorLog;
    expect(log).toEqual([
      expect.objectContaining({ source: 'backup', message: 'share sheet crashed' }),
    ]);
    expect(instances[0].captureException).toHaveBeenCalledWith(expect.any(Error), {
      source: 'backup',
    });
  });

  it('logs a rejected import file locally', async () => {
    const db = testDb();
    await seedOnboarded(db);
    testBackupIo().picked = { name: 'x.txt', contents: 'nope' };
    await renderApp('/me');
    await fireEvent.press(await screen.findByRole('button', { name: 'Import data' }));
    await screen.findByText("That file isn't a Leanlog backup.");
    expect((await exportAll(db)).errorLog).toEqual([expect.objectContaining({ source: 'backup' })]);
  });
});
