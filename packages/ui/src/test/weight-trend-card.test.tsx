import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { WeightTrendCard } from '../organisms/WeightTrendCard';

afterEach(cleanup);

const NOW = new Date(2026, 4, 28); // 2026-05-28

function iso(daysAgo: number): string {
  const d = new Date(NOW);
  d.setDate(d.getDate() - daysAgo);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

describe('WeightTrendCard', () => {
  it('shows empty-state overlay when no entries are provided', () => {
    render(<WeightTrendCard entries={[]} goalWeightLbs={null} now={NOW} />);
    expect(screen.getByText(/Start logging your weight on the day page/i)).toBeInTheDocument();
  });

  it('shows empty-state overlay when no entries fall inside the selected range', () => {
    render(
      <WeightTrendCard
        entries={[{ date: iso(60), weightLbs: 185 }]}
        goalWeightLbs={null}
        defaultRange="7d"
        now={NOW}
      />,
    );
    expect(screen.getByText(/Start logging your weight on the day page/i)).toBeInTheDocument();
  });

  it('renders without empty overlay when entries fall inside the range', () => {
    render(
      <WeightTrendCard
        entries={[
          { date: iso(5), weightLbs: 182 },
          { date: iso(2), weightLbs: 181 },
        ]}
        goalWeightLbs={175}
        defaultRange="7d"
        now={NOW}
      />,
    );
    expect(
      screen.queryByText(/Start logging your weight on the day page/i),
    ).not.toBeInTheDocument();
  });

  it('exposes the four range tabs', () => {
    render(<WeightTrendCard entries={[]} goalWeightLbs={null} now={NOW} />);
    expect(screen.getByRole('tab', { name: '7d' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '30d' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '90d' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'All' })).toBeInTheDocument();
  });
});
