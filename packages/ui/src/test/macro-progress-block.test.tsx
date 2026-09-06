import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MacroProgressBlock } from '../molecules/MacroProgressBlock';

afterEach(cleanup);

const defaultProps = {
  label: 'Today',
  calories: 1800,
  calorieTarget: 2200,
  adjustedCalories: 1800,
  protein: 152,
  proteinTarget: 160,
  carbs: 200,
  carbsTarget: 236,
  fat: 92,
  fatTarget: 65,
  fiber: 25,
};

describe('MacroProgressBlock', () => {
  it('hides the adjusted parenthetical when it matches the main total', () => {
    render(<MacroProgressBlock {...defaultProps} />);
    expect(screen.queryByText(/adj/)).not.toBeInTheDocument();
  });

  it('shows the fiber-adjusted total in parentheses when it differs', () => {
    render(<MacroProgressBlock {...defaultProps} calories={2006} adjustedCalories={1780} />);
    expect(screen.getByText(/2006 \/ 2200/)).toBeInTheDocument();
    expect(screen.getByText(/\(1780 adj\)/)).toBeInTheDocument();
  });
});
