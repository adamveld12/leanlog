import { render, screen } from '@testing-library/react';
import * as ClerkReact from '@clerk/clerk-react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import App from '../App';
import { StateProvider } from '../state';

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

  it('redirects signed-in users from / to /track', () => {
    renderApp('/');

    expect(screen.getByRole('heading', { level: 1, name: 'leanlog' })).toBeInTheDocument();
    expect(screen.getByText('Days')).toBeInTheDocument();
  });
});
