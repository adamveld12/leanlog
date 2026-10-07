import { exportAll } from '../db/repos/exportImport';
import type { Db } from '../db/types';
import { localDate } from '../state/date';
import { backupCounts, type BackupCounts } from './counts';
import type { BackupIO } from './io';

// Export everything on the device (R32) as JSON through the Android share sheet.
export async function exportBackup(
  db: Db,
  io: BackupIO,
  now: Date,
): Promise<{ fileName: string; counts: BackupCounts }> {
  const data = await exportAll(db, now.toISOString());
  const fileName = `leanlog-export-${localDate(now)}.json`;
  const uri = await io.writeCacheFile(fileName, JSON.stringify(data));
  await io.share(uri);
  return { fileName, counts: backupCounts(data) };
}
