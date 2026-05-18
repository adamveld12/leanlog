import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import App from '../App';
import { todayIso } from '../lib';
import { StateProvider } from '../state';
import type { AppState } from '../types';

function renderApp(route: string, state: AppState) {
  localStorage.setItem('mealTracker.v1', JSON.stringify(state));
  return render(
    <StateProvider>
      <MemoryRouter initialEntries={[route]}>
        <App />
      </MemoryRouter>
    </StateProvider>,
  );
}

describe('list section behaviors', () => {
  it('day list row opens detail and supports delete', async () => {
    const state: AppState = {
      version: 1,
      settings: {
        calorieTarget: 2000,
        mealCountTarget: 3,
        macroTargets: { fat: 70, saturatedFat: 20, carbs: 250, fiber: 30, protein: 140 },
        theme: 'system',
      },
      days: [
        {
          id: 'd1',
          date: todayIso(),
          targets: { calories: 2700, macros: { fat: 75, carbs: 236, protein: 270 } },
          meals: [
            {
              id: 'm1',
              name: 'BREAKFAST',
              ingredients: [
                {
                  id: 'i1',
                  name: 'EGG',
                  weight: 50,
                  calories: 100,
                  fat: 7,
                  saturatedFat: 2,
                  carbs: 1,
                  fiber: 0,
                  protein: 8,
                },
              ],
            },
          ],
        },
      ],
    };

    renderApp('/', state);

    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText(/100/)).toBeInTheDocument();

    await userEvent.click(screen.getByText('Today').closest('[role="link"]') as HTMLElement);
    expect(screen.getByText('Daily totals')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('link', { name: '← Back' }));
    await userEvent.click(screen.getAllByRole('button', { name: 'Delete day' })[0]);
    expect(screen.queryByText('Today')).not.toBeInTheDocument();
  });

  it('ingredient list row opens ingredient editor and supports delete', async () => {
    const state: AppState = {
      version: 1,
      settings: {
        calorieTarget: 2000,
        mealCountTarget: 3,
        macroTargets: { fat: 70, saturatedFat: 20, carbs: 250, fiber: 30, protein: 140 },
        theme: 'system',
      },
      days: [
        {
          id: 'd1',
          date: todayIso(),
          targets: { calories: 2700, macros: { fat: 75, carbs: 236, protein: 270 } },
          meals: [
            {
              id: 'm1',
              name: 'LUNCH',
              ingredients: [
                {
                  id: 'i1',
                  name: 'CHICKEN',
                  weight: 120,
                  calories: 220,
                  fat: 6,
                  saturatedFat: 1.5,
                  carbs: 0,
                  fiber: 0,
                  protein: 42,
                },
              ],
            },
          ],
        },
      ],
    };

    renderApp('/day/d1/meal/m1', state);

    expect(
      Array.from(document.querySelectorAll('.ll-meta')).some((el) =>
        (el.textContent ?? '').includes('220 kcal · P 42g · C 0g · F 6g'),
      ),
    ).toBe(true);
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();
    expect(document.querySelector('.ll-sticky-footer')).toBeNull();

    await userEvent.click(screen.getByRole('link', { name: /CHICKEN/i }));
    expect(screen.getByDisplayValue('CHICKEN')).toBeInTheDocument();

    await userEvent.click(screen.getAllByRole('button', { name: 'Delete ingredient' })[0]);
    expect(screen.queryByRole('link', { name: /CHICKEN/i })).not.toBeInTheDocument();
  });
});
