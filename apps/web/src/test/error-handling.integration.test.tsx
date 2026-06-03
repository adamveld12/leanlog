import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AnalyticsErrorBoundary } from '../analytics';
import App from '../App';
import { api } from '../api';
import { StateProvider } from '../state';

vi.mock('react-chartjs-2', () => ({ Line: () => null }));

const apiMock = api as unknown as {
  days: {
    list: ReturnType<typeof vi.fn>;
  };
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  apiMock.days.list.mockResolvedValue({ days: [] });
});

function renderApp(route: string) {
  return render(
    <StateProvider>
      <MemoryRouter initialEntries={[route]}>
        <App />
      </MemoryRouter>
    </StateProvider>,
  );
}

function BrokenChild(): null {
  throw new Error('Render failed');
}

describe('app error handling', () => {
  it('shows a full-page recovery state when initial tracker data cannot load', async () => {
    apiMock.days.list.mockRejectedValue(
      new Error('API returned invalid payload (Not JSON) for /api/days'),
    );

    renderApp('/track');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Unable to load LeanLog' })).toBeInTheDocument();
    });
    expect(
      screen.getByText('API returned invalid payload (Not JSON) for /api/days'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go home' })).toHaveAttribute('href', '/');
  });

  it('uses the same recovery page for render errors caught by the boundary', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(
      <AnalyticsErrorBoundary>
        <BrokenChild />
      </AnalyticsErrorBoundary>,
    );

    expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go home' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('button', { name: 'Refresh page' })).toBeInTheDocument();
  });
});
