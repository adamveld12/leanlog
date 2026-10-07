import { FakeBackupIo } from './fakeBackupIo';

// One fake backup IO per test, reached through the mocked `nativeIo` (see setup.ts).
let current: FakeBackupIo | undefined;

export const testBackupIo = (): FakeBackupIo => (current ??= new FakeBackupIo());
export const resetTestBackupIo = (): void => {
  current = undefined;
};
