import { renderRouter, screen } from 'expo-router/testing-library';

// Render the real app directory (renderRouter reads ./app via require.context).
describe('tab layout', () => {
  it('renders all four tabs', async () => {
    await renderRouter('./app', { initialUrl: '/' });
    for (const name of ['Today', 'Body', 'Foods', 'Me']) {
      expect(await screen.findByLabelText(new RegExp(`^${name}, tab`))).toBeTruthy();
    }
  });
});
