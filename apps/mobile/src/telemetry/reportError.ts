import { logError } from '../db/repos/errorLog';
import type { Db } from '../db/types';
import { captureException } from './analytics';

// Record an error in the local log (always) and with analytics (only if the user opted in).
// Resolves once the log write is done; callers that don't care can ignore the promise.
export async function reportError(db: Db, source: string, error: unknown): Promise<void> {
  captureException(error, { source });
  try {
    await logError(db, source, error);
  } catch {
    // The log itself is unavailable; there is nowhere left to report to.
  }
}
