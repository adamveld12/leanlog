import { cleanup } from '@testing-library/react-native';
import { resetTestBackupIo } from './backupIoHolder';
import { resetTestHc } from './hcHolder';
import { resetTestDb } from './testDb';

// Global cleanup, mirroring the vitest setup files; don't add per-file cleanup.
afterEach(cleanup);
beforeEach(() => {
  resetTestDb();
  resetTestHc();
  resetTestBackupIo();
});

// The real database needs the native expo-sqlite module; screens get the
// in-memory one instead.
jest.mock('../db/useDatabase', () => ({
  useDatabase: () => ({ db: jest.requireActual('./testDb').testDb(), error: undefined }),
}));

// Pin "now" to Tue 2026-10-06 09:00 local so day logic is deterministic.
jest.mock('../clock', () => ({ now: () => new Date(2026, 9, 6, 9, 0) }));

// The native Health Connect module isn't available in jest; delegate every call to
// the per-test fake (unavailable unless a test installs one with `setTestHc`).
jest.mock('../health/nativeClient', () => {
  const { testHc } = jest.requireActual('./hcHolder');
  return {
    nativeClient: new Proxy(
      {},
      {
        get:
          (_target, method: string) =>
          (...args: unknown[]) =>
            testHc()[method](...args),
      },
    ),
  };
});

// Likewise for the file system, share sheet and document picker.
jest.mock('../backup/nativeIo', () => {
  const { testBackupIo } = jest.requireActual('./backupIoHolder');
  return {
    nativeIo: new Proxy(
      {},
      {
        get:
          (_target, method: string) =>
          (...args: unknown[]) =>
            testBackupIo()[method](...args),
      },
    ),
  };
});
