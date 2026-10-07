import { FakeHealthConnect } from './fakeHealthConnect';

// One fake Health Connect per test, reached through the mocked `nativeClient`
// (see setup.ts). Unavailable by default, so screens behave as on a device
// without Health Connect; tests opt in with `setTestHc`.
let current: FakeHealthConnect | undefined;

// Used by the jest mock in setup.ts through jest.requireActual, which static analysis can't see.
// react-doctor-disable-next-line deslop/unused-export
export const testHc = (): FakeHealthConnect =>
  (current ??= new FakeHealthConnect({ ownPackage: 'app.leanlog.mobile', status: 1 }));
export const setTestHc = (fake: FakeHealthConnect): void => {
  current = fake;
};
export const resetTestHc = (): void => {
  current = undefined;
};
