import { cleanup, render, screen, waitFor } from '@testing-library/react';
import * as ClerkReact from '@clerk/clerk-react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { api, ApiError } from '../api';
import { StateProvider } from '../state';
import type { DailyMealLog } from '@leanlog/data-access';

vi.mock('react-chartjs-2', () => ({ Line: () => null }));

const setSignedIn = (ClerkReact as unknown as { __setSignedIn: (value: boolean) => void })
  .__setSignedIn;

const apiMock = api as unknown as {
  days: {
    list: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
  };
};

const now = new Date().toISOString();

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location-probe">{location.pathname}</div>;
}

function renderApp(route: string) {
  return render(
    <StateProvider>
      <MemoryRouter initialEntries={[route]}>
        <App />
        <LocationProbe />
      </MemoryRouter>
    </StateProvider>,
  );
}

function makeDay(): DailyMealLog {
  return {
    id: 'd1',
    userId: 'user_test',
    date: '2026-05-26',
    targetCalories: 2700,
    targetFat: 75,
    targetCarbs: 236,
    targetProtein: 270,
    mealCountTarget: 4,
    weightLbs: null,
    meals: [
      {
        id: 'm1',
        dailyMealLogId: 'd1',
        name: 'BREAKFAST',
        createdAt: now,
        updatedAt: now,
        ingredients: [
          {
            id: 'i1',
            mealId: 'm1',
            name: 'EGG',
            weight: 50,
            calories: 100,
            estimatedCalories: 100,
            calorieSource: 'estimated' as const,
            fat: 7,
            saturatedFat: 2,
            carbs: 1,
            fiber: 0,
            protein: 8,
            sugarAlcohol: null,
            allulose: null,
            alcohol: null,
            createdAt: now,
            updatedAt: now,
          },
        ],
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
}

describe('deep-link routing', () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    setSignedIn(true);
    apiMock.days.list.mockResolvedValue({ days: [] });
    apiMock.days.get.mockReset();
  });

  it('loads an existing day when opened directly', async () => {
    apiMock.days.get.mockResolvedValue(makeDay());

    renderApp('/track/day/d1');

    expect(screen.getByRole('status')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Daily totals')).toBeInTheDocument();
    });
    expect(screen.getByText('Meals 1 / 4')).toBeInTheDocument();
    expect(apiMock.days.get).toHaveBeenCalledWith('test-token', 'd1');
  });

  it('loads an existing meal when opened directly', async () => {
    apiMock.days.get.mockResolvedValue(makeDay());

    renderApp('/track/day/d1/meal/m1');

    await waitFor(() => {
      expect(screen.getByDisplayValue('BREAKFAST')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /EGG/i })).toBeInTheDocument();
    expect(apiMock.days.get).toHaveBeenCalledWith('test-token', 'd1');
  });

  it('redirects missing days back to the day list after route loading', async () => {
    apiMock.days.get.mockRejectedValue(new ApiError(404, 'Not found'));

    renderApp('/track/day/missing');

    await waitFor(() => {
      expect(screen.getByTestId('location-probe')).toHaveTextContent('/track');
    });
  });

  it('shows recoverable error state for non-404 route loading failures', async () => {
    apiMock.days.get.mockRejectedValue(new ApiError(500, 'Network timeout'));

    renderApp('/track/day/d1');

    await waitFor(() => {
      expect(screen.getByText('Unable to load tracker data')).toBeInTheDocument();
    });
    expect(screen.getByText('API 500: Network timeout')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to days' })).toBeInTheDocument();
    expect(screen.getByTestId('location-probe')).toHaveTextContent('/track/day/d1');
  });

  it('does not classify generic errors containing API 404 text as not found', async () => {
    apiMock.days.get.mockRejectedValue(new Error('Proxy reported API 404 in response body'));

    renderApp('/track/day/d1');

    await waitFor(() => {
      expect(screen.getByText('Unable to load tracker data')).toBeInTheDocument();
    });
    expect(screen.getByText('Proxy reported API 404 in response body')).toBeInTheDocument();
    expect(screen.getByTestId('location-probe')).toHaveTextContent('/track/day/d1');
  });

  it('redirects signed-out users from direct tracker URLs to the landing page', () => {
    setSignedIn(false);

    renderApp('/track/day/d1');

    expect(screen.getByRole('heading', { level: 1, name: 'LeanLog' })).toBeInTheDocument();
    expect(apiMock.days.get).not.toHaveBeenCalled();
  });
});
