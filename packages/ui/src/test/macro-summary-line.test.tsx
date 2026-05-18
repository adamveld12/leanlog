import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MacroSummaryLine } from '../components/MacroSummaryLine';

describe('MacroSummaryLine', () => {
  it('renders plain macro summary', () => {
    render(<MacroSummaryLine calories={520} protein={31} carbs={42} fat={20} />);
    expect(screen.getByText(/520/)).toBeInTheDocument();
    expect(screen.getByText(/P 31/)).toBeInTheDocument();
    expect(screen.getByText(/C 42/)).toBeInTheDocument();
    expect(screen.getByText(/F 20/)).toBeInTheDocument();
  });

  it('renders target calories and color-codes calorie portion', () => {
    render(
      <MacroSummaryLine calories={520} calorieTarget={600} protein={31} carbs={42} fat={20} />,
    );
    const caloriePortion = screen.getByText(/520 \/ 600/);
    expect(caloriePortion).toHaveStyle({ color: 'var(--ll-warn)' });
  });
});
