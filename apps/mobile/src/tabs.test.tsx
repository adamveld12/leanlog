import { renderRouter, screen } from 'expo-router/testing-library';

// The real database needs the native expo-sqlite module; use the in-memory one.
jest.mock('./db/useDatabase', () => {
  const { createTestDb } = jest.requireActual('./test/db');
  const db = createTestDb();
  return { useDatabase: () => ({ db, error: undefined }) };
});

// Render the real app directory (renderRouter reads ./app via require.context).
describe('tab layout', () => {
  it('renders all four tabs', async () => {
    await renderRouter('./app', { initialUrl: '/' });
    for (const name of ['Today', 'Body', 'Foods', 'Me']) {
      expect(await screen.findByLabelText(new RegExp(`^${name}, tab`))).toBeTruthy();
    }
  });
});
