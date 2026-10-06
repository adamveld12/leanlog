import { screen } from 'expo-router/testing-library';
import { renderApp } from './test/renderApp';

describe('tab layout', () => {
  it('renders all four tabs', async () => {
    await renderApp('/');
    for (const name of ['Today', 'Body', 'Foods', 'Me']) {
      expect(await screen.findByLabelText(new RegExp(`^${name}, tab`))).toBeTruthy();
    }
  });
});
