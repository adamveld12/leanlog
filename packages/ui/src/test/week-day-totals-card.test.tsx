import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { WeekDayTotalsCard, type WeekDayRow } from '../organisms/WeekDayTotalsCard';

const row = (overrides: Partial<WeekDayRow> = {}): WeekDayRow => ({
  key: '2026-10-07',
  label: 'Today',
  logged: true,
  calories: 1240,
  protein: 92,
  carbs: 110,
  fat: 41,
  weightLbs: 182.4,
  details: 'Breakfast: EGGS',
  ...overrides,
});

const average = { calories: 1551.4, protein: 103.2, carbs: 154, fat: 50.6 };

describe('WeekDayTotalsCard', () => {
  it('shows the rounded per-day average', () => {
    render(<WeekDayTotalsCard average={average} rows={[row()]} />);
    expect(screen.getByTestId('week-average')).toHaveTextContent('1551 kcal');
  });

  it('shows each logged day with its calories and weight', () => {
    render(<WeekDayTotalsCard average={average} rows={[row()]} />);
    const toggle = screen.getByRole('button', { name: /Today/ });
    expect(toggle).toHaveTextContent('1240 kcal');
    expect(toggle).toHaveTextContent('182.4 lbs');
  });

  it('marks unlogged days and does not let them expand', () => {
    render(
      <WeekDayTotalsCard
        average={average}
        rows={[row({ key: '2026-10-05', label: 'Oct 5', logged: false, details: undefined })]}
      />,
    );
    expect(screen.getByText('Oct 5')).toBeInTheDocument();
    expect(screen.getByText('Not logged')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Oct 5/ })).not.toBeInTheDocument();
  });

  it('expands a day to show what was eaten, and collapses it again', async () => {
    render(<WeekDayTotalsCard average={average} rows={[row()]} />);
    const toggle = screen.getByRole('button', { name: /Today/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Breakfast: EGGS')).not.toBeInTheDocument();

    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Breakfast: EGGS')).toBeInTheDocument();

    await userEvent.click(toggle);
    expect(screen.queryByText('Breakfast: EGGS')).not.toBeInTheDocument();
  });
});
