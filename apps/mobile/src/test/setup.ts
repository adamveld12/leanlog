import { cleanup } from '@testing-library/react-native';
import { resetTestDb } from './testDb';

// Global cleanup, mirroring the vitest setup files; don't add per-file cleanup.
afterEach(cleanup);
beforeEach(resetTestDb);

// The real database needs the native expo-sqlite module; screens get the
// in-memory one instead.
jest.mock('../db/useDatabase', () => ({
  useDatabase: () => ({ db: jest.requireActual('./testDb').testDb(), error: undefined }),
}));

// Pin "now" to Tue 2026-10-06 09:00 local so day logic is deterministic.
jest.mock('../clock', () => ({ now: () => new Date(2026, 9, 6, 9, 0) }));
