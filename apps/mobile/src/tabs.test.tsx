import { screen } from 'expo-router/testing-library';
import { renderApp } from './test/renderApp';
import { seedOnboarded } from './test/seed';
import { testDb } from './test/testDb';

describe('tab layout', () => {
  it('renders all four tabs', async () => {
    await seedOnboarded(testDb());
    await renderApp('/');
    for (const name of ['Today', 'Body', 'Foods', 'Me']) {
      expect(await screen.findByLabelText(new RegExp(`^${name}, tab`))).toBeTruthy();
    }
  });
});
