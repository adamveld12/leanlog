import { MobileExportSchema, type MobileExport } from '@leanlog/data-access';
import { backupCounts, type BackupCounts } from './counts';
import type { BackupIO } from './io';

// An import problem with a message that is safe to show to the user.
export class ImportFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImportFileError';
  }
}

export type ImportPreview = { fileName: string; data: MobileExport; counts: BackupCounts };

const UNREADABLE = "Leanlog couldn't read that file.";
const NOT_A_BACKUP = "That file isn't a Leanlog backup.";
const TOO_NEW = 'This backup was made by a newer version of Leanlog. Update the app to import it.';

// Let the user pick a backup and check it before anything is touched (R33). The
// file is parsed and validated here; replacing the data happens only after the
// user confirms, in one transaction (see replaceAll).
export async function pickBackup(io: BackupIO): Promise<ImportPreview | null> {
  let text: string;
  let fileName: string;
  try {
    const picked = await io.pickFile();
    if (!picked) return null;
    fileName = picked.name;
    text = await io.readFile(picked.uri);
  } catch {
    throw new ImportFileError(UNREADABLE);
  }

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new ImportFileError(NOT_A_BACKUP);
  }

  if (
    typeof json === 'object' &&
    json !== null &&
    'format' in json &&
    json.format === 'leanlog-mobile' &&
    'version' in json &&
    typeof json.version === 'number' &&
    json.version > 1
  ) {
    throw new ImportFileError(TOO_NEW);
  }

  const parsed = MobileExportSchema.safeParse(json);
  if (!parsed.success) throw new ImportFileError(NOT_A_BACKUP);
  return { fileName, data: parsed.data, counts: backupCounts(parsed.data) };
}
