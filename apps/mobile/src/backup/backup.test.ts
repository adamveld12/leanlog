import { MobileExportSchema } from '@leanlog/data-access';
import { mobileSampleExport } from '@leanlog/data-access/fixtures/mobileSample';
import exportV1 from './__fixtures__/export-v1.json';
import { createTestDb } from '../test/db';
import { FakeBackupIo } from '../test/fakeBackupIo';
import { ensureSeeded } from '../db/repos/base';
import { exportAll, replaceAll } from '../db/repos/exportImport';
import { exportBackup } from './exportData';
import { ImportFileError, pickBackup } from './importData';

async function seededWithFixture() {
  const db = createTestDb();
  await ensureSeeded(db);
  await replaceAll(db, MobileExportSchema.parse(exportV1));
  return db;
}

describe('exportBackup', () => {
  it('writes every entity to a dated JSON file and opens the share sheet', async () => {
    const db = await seededWithFixture();
    const io = new FakeBackupIo();
    const result = await exportBackup(db, io, new Date(2026, 9, 6, 9, 0));

    expect(result.fileName).toBe('leanlog-export-2026-10-06.json');
    expect(io.shared).toEqual(['file:///cache/leanlog-export-2026-10-06.json']);
    const written = JSON.parse(io.files.get(io.shared[0]) ?? '');
    expect(MobileExportSchema.parse(written)).toMatchObject({
      profile: mobileSampleExport.profile,
      savedFoods: mobileSampleExport.savedFoods,
      bodyFatResults: mobileSampleExport.bodyFatResults,
      days: mobileSampleExport.days,
    });
    expect(result.counts).toEqual({
      days: 14,
      meals: 3,
      ingredients: 4,
      savedFoods: 2,
      bodyFatResults: 1,
    });
  });

  it('reports a share-sheet failure instead of pretending it worked', async () => {
    const db = await seededWithFixture();
    const io = new FakeBackupIo();
    io.failShare = new Error('no app to share with');
    await expect(exportBackup(db, io, new Date())).rejects.toThrow('no app to share with');
  });
});

describe('pickBackup', () => {
  const pick = (contents: string, name = 'leanlog.json') => {
    const io = new FakeBackupIo();
    io.picked = { name, contents };
    return { io, result: pickBackup(io) };
  };

  it('returns null when the user cancels the picker', async () => {
    const io = new FakeBackupIo();
    expect(await pickBackup(io)).toBeNull();
  });

  it('validates the file and previews what it holds', async () => {
    const { result } = pick(JSON.stringify(exportV1));
    const preview = await result;
    expect(preview?.fileName).toBe('leanlog.json');
    expect(preview?.counts).toEqual({
      days: 14,
      meals: 3,
      ingredients: 4,
      savedFoods: 2,
      bodyFatResults: 1,
    });
    expect(preview?.data.profile.heightIn).toBe(72);
  });

  it.each([
    ['not JSON', 'definitely not json', /isn't a Leanlog backup/i],
    ['a different format', JSON.stringify({ hello: 'world' }), /isn't a Leanlog backup/i],
    [
      'a newer version',
      JSON.stringify({ ...exportV1, version: 2 }),
      /isn't a Leanlog backup|newer version/i,
    ],
    [
      'a macro split that does not add up',
      JSON.stringify({ ...exportV1, profile: { ...exportV1.profile, macroFats: 50 } }),
      /isn't a Leanlog backup/i,
    ],
  ])('rejects %s with a readable message', async (_label, contents, message) => {
    const { result } = pick(contents);
    await expect(result).rejects.toBeInstanceOf(ImportFileError);
    await expect(result).rejects.toThrow(message);
  });

  it('reports a file that cannot be read', async () => {
    const io = new FakeBackupIo();
    io.picked = new Error('permission denied');
    await expect(pickBackup(io)).rejects.toThrow(/couldn't read/i);
  });

  it('a rejected file changes nothing', async () => {
    const db = await seededWithFixture();
    const before = await exportAll(db, 'x');
    const { result } = pick('nope');
    await expect(result).rejects.toBeInstanceOf(ImportFileError);
    expect(await exportAll(db, 'x')).toEqual(before);
  });
});
