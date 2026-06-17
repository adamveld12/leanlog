import { render, screen, waitFor } from '@testing-library/react';
import * as ClerkReact from '@clerk/clerk-react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import App from '../App';
import { StateProvider } from '../state';

// chart.js's ResizeObserver tick reads getComputedStyle on a parent that jsdom has
// already detached. Stub the wrapper for integration tests that mount the chart.
vi.mock('react-chartjs-2', () => ({ Line: () => null }));

const setSignedIn = (ClerkReact as unknown as { __setSignedIn: (value: boolean) => void })
  .__setSignedIn;

function renderApp(route: string) {
  return render(
    <StateProvider>
      <MemoryRouter initialEntries={[route]}>
        <App />
      </MemoryRouter>
    </StateProvider>,
  );
}

describe('auth routing', () => {
  it('redirects signed-out users from /track to landing at /', () => {
    setSignedIn(false);

    renderApp('/track');

    expect(screen.getByRole('heading', { level: 1, name: 'LeanLog' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in / Sign up' })).toBeInTheDocument();
  });

  it('redirects signed-in users from / to /track', async () => {
    renderApp('/');

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'LeanLog' })).toBeInTheDocument();
    });
    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
  });
});
