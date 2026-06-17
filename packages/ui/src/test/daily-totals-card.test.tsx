import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { DailyTotalsCard } from '../organisms/DailyTotalsCard';

afterEach(cleanup);

const defaultProps = {
  calories: 1800,
  calorieTarget: 2200,
  fat: 92,
  protein: 152,
  carbs: 200,
  fiber: 25,
  macroTargets: { fat: 65, protein: 160, carbs: 236 },
};

describe('DailyTotalsCard', () => {
  it('shows Protein progress row', () => {
    render(<DailyTotalsCard {...defaultProps} />);
    expect(screen.getByText('Protein')).toBeInTheDocument();
    expect(screen.getByText(/152 \/ 160/)).toBeInTheDocument();
  });

  it('shows Carbs progress row with total/target and net as info', () => {
    render(<DailyTotalsCard {...defaultProps} />);
    expect(screen.getByText('Carbs')).toBeInTheDocument();
    // progress uses total carbs (200) against target (236); netCarbs = 200 - 25 = 175 (informational)
    expect(screen.getByText(/200 \/ 236/)).toBeInTheDocument();
    expect(screen.getByText(/175 net/)).toBeInTheDocument();
  });

  it('shows Fat progress row', () => {
    render(<DailyTotalsCard {...defaultProps} />);
    expect(screen.getByText('Fat')).toBeInTheDocument();
    expect(screen.getByText(/92 \/ 65/)).toBeInTheDocument();
  });

  it('does not show the old compact FAT · PROTEIN · CARBS row', () => {
    render(<DailyTotalsCard {...defaultProps} />);
    expect(screen.queryByText(/FAT/)).not.toBeInTheDocument();
    expect(screen.queryByText(/PROTEIN/)).not.toBeInTheDocument();
    expect(screen.queryByText(/CARBS/)).not.toBeInTheDocument();
  });

  it('clamps net carbs to 0 when fiber exceeds carbs', () => {
    render(<DailyTotalsCard {...defaultProps} carbs={8} fiber={12} />);
    expect(screen.getByText(/8 \/ 236/)).toBeInTheDocument();
    expect(screen.getByText(/0 net/)).toBeInTheDocument();
  });

  it('still shows calorie row', () => {
    render(<DailyTotalsCard {...defaultProps} />);
    expect(screen.getByText(/1800 \/ 2200/)).toBeInTheDocument();
  });
});
