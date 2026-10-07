import { fireEvent, screen, within } from 'expo-router/testing-library';
import exportV1 from '../backup/__fixtures__/export-v1.json';
import { exportAll } from '../db/repos/exportImport';
import { addMeal } from '../db/repos/meals';
import { testBackupIo } from '../test/backupIoHolder';
import { renderApp } from '../test/renderApp';
import { seedOnboarded } from '../test/seed';
import { testDb } from '../test/testDb';

const TODAY = '2026-10-06';

describe('Me › Backup', () => {
  it('exports everything through the share sheet', async () => {
    const db = testDb();
    await seedOnboarded(db);
    await renderApp('/me');
    await fireEvent.press(await screen.findByRole('button', { name: 'Export data' }));
    expect(await screen.findByText('Exported leanlog-export-2026-10-06.json')).toBeTruthy();
    const io = testBackupIo();
    expect(io.shared).toEqual(['file:///cache/leanlog-export-2026-10-06.json']);
  });

  it('says so when the share sheet fails', async () => {
    await seedOnboarded(testDb());
    testBackupIo().failShare = new Error('Sharing is not available on this device.');
    await renderApp('/me');
    await fireEvent.press(await screen.findByRole('button', { name: 'Export data' }));
    expect(await screen.findByText('Sharing is not available on this device.')).toBeTruthy();
  });

  it('asks before replacing anything, and Cancel leaves the data alone', async () => {
    const db = testDb();
    await seedOnboarded(db);
    await addMeal(db, TODAY, TODAY, 'Mine');
    const before = await exportAll(db, 'x');
    testBackupIo().picked = { name: 'backup.json', contents: JSON.stringify(exportV1) };
    await renderApp('/me');
    await fireEvent.press(await screen.findByRole('button', { name: 'Import data' }));

    expect(await screen.findByText('Replace everything on this phone?')).toBeTruthy();
    expect(
      screen.getByText(/14 days, 3 meals, 4 ingredients, 2 saved foods and 1 body fat result/),
    ).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByText('Replace everything on this phone?')).toBeNull();
    expect(await exportAll(db, 'x')).toEqual(before);
  });

  it('replaces everything after confirming, and today still has a day', async () => {
    const db = testDb();
    await seedOnboarded(db);
    await addMeal(db, TODAY, TODAY, 'Mine');
    testBackupIo().picked = { name: 'backup.json', contents: JSON.stringify(exportV1) };
    await renderApp('/me');
    await fireEvent.press(await screen.findByRole('button', { name: 'Import data' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Replace all data' }));
    expect(await screen.findByText('Imported backup.json')).toBeTruthy();

    const after = await exportAll(db, 'x');
    expect(after.meals.map((m) => m.name).sort()).toEqual(['Breakfast', 'Dinner', 'Lunch']);
    expect(after.savedFoods.map((f) => f.name).sort()).toEqual(['Eggs', 'Oats']);
    expect(after.profile).toMatchObject({ heightIn: 72, birthDate: '1991-01-01' });
    expect(after.days.some((d) => d.date === TODAY)).toBe(true);
  });

  it('rejects a file that is not a backup without touching the data', async () => {
    const db = testDb();
    await seedOnboarded(db);
    const before = await exportAll(db, 'x');
    testBackupIo().picked = { name: 'notes.txt', contents: 'just some notes' };
    await renderApp('/me');
    await fireEvent.press(await screen.findByRole('button', { name: 'Import data' }));
    expect(await screen.findByText("That file isn't a Leanlog backup.")).toBeTruthy();
    expect(screen.queryByText('Replace everything on this phone?')).toBeNull();
    // The rejection itself is recorded in the error log; everything else is untouched.
    expect({ ...(await exportAll(db, 'x')), errorLog: [] }).toEqual({ ...before, errorLog: [] });
  });

  it('does nothing when the picker is cancelled', async () => {
    await seedOnboarded(testDb());
    await renderApp('/me');
    await fireEvent.press(await screen.findByRole('button', { name: 'Import data' }));
    expect(screen.queryByText('Replace everything on this phone?')).toBeNull();
    expect(screen.queryByText(/isn't a Leanlog backup/)).toBeNull();
  });

  it('the confirm dialog is only offered inside its own container', async () => {
    await seedOnboarded(testDb());
    testBackupIo().picked = { name: 'backup.json', contents: JSON.stringify(exportV1) };
    await renderApp('/me');
    await fireEvent.press(await screen.findByRole('button', { name: 'Import data' }));
    const dialog = await screen.findByLabelText('Replace everything on this phone?');
    expect(within(dialog).getByRole('button', { name: 'Replace all data' })).toBeTruthy();
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeTruthy();
  });
});
