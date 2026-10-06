import { exportAll } from '../db/repos/exportImport';
import type { Db } from '../db/types';
import type { Snapshot } from './selectors';

export async function loadSnapshot(db: Db): Promise<Snapshot> {
  const { format: _f, version: _v, exportedAt: _e, errorLog: _l, ...data } = await exportAll(db);
  return data;
}
