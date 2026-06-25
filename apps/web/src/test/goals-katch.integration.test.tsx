import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { api } from '../api';
import { StateProvider } from '../state';
import type { Goal } from '@leanlog/data-access';

vi.mock('react-chartjs-2', () => ({ Line: () => null }));

const now = new Date().toISOString();

const backgroundGoal: Goal = {
  id: 'bg',
  userId: 'user_test',
  isBackground: true,
  name: 'Maintenance',
  description: null,
  mode: 'maintain',
  targetWeightLbs: null,
  macroFats: 25,
  macroCarbs: 35,
  macroProtein: 40,
  startDate: null,
  endDate: null,
  calorieDelta: 0,
  calorieBasis: 'bodyweight',
  bodyFatPct: null,
  activityLevel: null,
  mealSlots: [
    { name: 'Breakfast', ingredients: [] },
    { name: 'Lunch', ingredients: [] },
    { name: 'Dinner', ingredients: [] },
    { name: 'Snack', ingredients: [] },
  ],
  createdAt: now,
  updatedAt: now,
};

const apiMock = api as unknown as {
  days: { list: ReturnType<typeof vi.fn> };
  goals: {
    list: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateBackground: ReturnType<typeof vi.fn>;
  };
};

function renderGoals() {
  return render(
    <StateProvider>
      <MemoryRouter initialEntries={['/track/goals']}>
        <App />
      </MemoryRouter>
    </StateProvider>,
  );
}

beforeEach(() => {
  apiMock.days.list.mockResolvedValue({ days: [] });
  apiMock.goals.list.mockResolvedValue({ goals: [backgroundGoal] });
  apiMock.goals.create.mockReset();
  apiMock.goals.updateBackground.mockReset();
});

afterEach(() => {
  cleanup();
});

describe('Goals: Katch-McArdle calorie basis (#63)', () => {
  it('creates a Cut goal on the Katch basis with a live breakdown (F1/AE2)', async () => {
    const user = userEvent.setup();
    apiMock.goals.create.mockImplementation((_t: string, data: unknown) =>
      Promise.resolve({
        ...backgroundGoal,
        ...(data as object),
        id: 'g-katch',
        isBackground: false,
      }),
    );

    renderGoals();
    await user.click(await screen.findByRole('button', { name: '+ Add Goal' }));

    // Switch mode to Cut and basis to Katch.
    await user.click(screen.getByLabelText('Cut (10×)'));
    await user.click(screen.getByLabelText('Katch-McArdle (body composition)'));

    // Body fat options are exactly 10/15/20/25 (AE5/R4).
    const bodyFat = screen.getByLabelText('Body fat %');
    const options = within(bodyFat as HTMLSelectElement)
      .getAllByRole('option')
      .map((o) => (o as HTMLOptionElement).value)
      .filter(Boolean);
    expect(options).toEqual(['10', '15', '20', '25']);

    // 200 lb (no weight logged → 180 fallback would apply; force a known weight by
    // picking inputs that the spec's example uses). With no logged weight the
    // preview uses 180 lb, so assert the live chain renders rather than a number.
    await user.selectOptions(bodyFat, '15');
    await user.selectOptions(screen.getByLabelText('Activity level'), 'moderate');

    expect(screen.getByText('Katch-McArdle breakdown')).toBeInTheDocument();
    expect(screen.getByText('Lean body mass')).toBeInTheDocument();
    expect(screen.getByText('BMR')).toBeInTheDocument();

    // Cut requires a target weight.
    await user.type(screen.getByLabelText('Target weight (lb)'), '180');
    await user.click(screen.getByRole('button', { name: 'Create goal' }));

    await waitFor(() => expect(apiMock.goals.create).toHaveBeenCalledTimes(1));
    const payload = apiMock.goals.create.mock.calls[0][1];
    expect(payload).toMatchObject({
      mode: 'cut',
      calorieBasis: 'katch',
      bodyFatPct: 15,
      activityLevel: 'moderate',
    });
  });

  it('blocks saving a Katch goal without body composition (AE4)', async () => {
    const user = userEvent.setup();
    renderGoals();
    await user.click(await screen.findByRole('button', { name: '+ Add Goal' }));

    await user.click(screen.getByLabelText('Maintain (15×)'));
    await user.click(screen.getByLabelText('Katch-McArdle (body composition)'));
    // No body fat / activity selected.
    await user.click(screen.getByRole('button', { name: 'Create goal' }));

    expect(
      await screen.findByText(/Body fat and activity level are required/i),
    ).toBeInTheDocument();
    expect(apiMock.goals.create).not.toHaveBeenCalled();
  });

  it('configures the background maintenance goal to Katch (F4/AE8)', async () => {
    const user = userEvent.setup();
    apiMock.goals.updateBackground.mockImplementation((_t: string, data: unknown) =>
      Promise.resolve({ ...backgroundGoal, ...(data as object) }),
    );

    renderGoals();
    // The default timeline selects the open maintenance segment.
    await screen.findByRole('heading', { name: 'Maintenance' });

    await user.click(screen.getByLabelText('Katch-McArdle (body composition)'));
    await user.selectOptions(screen.getByLabelText('Body fat %'), '20');
    await user.selectOptions(screen.getByLabelText('Activity level'), 'sedentary');
    await user.click(screen.getByRole('button', { name: 'Save maintenance basis' }));

    await waitFor(() => expect(apiMock.goals.updateBackground).toHaveBeenCalledTimes(1));
    expect(apiMock.goals.updateBackground.mock.calls[0][1]).toMatchObject({
      calorieBasis: 'katch',
      bodyFatPct: 20,
      activityLevel: 'sedentary',
    });
  });
});
