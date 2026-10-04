import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { QuickActionsCard } from '../organisms/QuickActionsCard';

describe('QuickActionsCard', () => {
  it('does not show a "Log an extra" button when onAddExtra is omitted', () => {
    render(<QuickActionsCard hasDays={false} />);
    expect(screen.queryByRole('button', { name: 'Log an extra' })).not.toBeInTheDocument();
  });

  // #37: meal logging and today's progress moved to TodayObjectivesCard, so this
  // card no longer duplicates them — "Log an extra" now leads.
  it('leads with "Log an extra" and no longer offers "Log a meal" (R9)', () => {
    render(<QuickActionsCard hasDays={false} onAddExtra={() => {}} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons[0]).toHaveTextContent('Log an extra');
    expect(screen.queryByRole('button', { name: 'Log a meal' })).not.toBeInTheDocument();
  });

  it('shows the weekly block but no Today block (moved to the objectives card)', () => {
    render(
      <QuickActionsCard
        hasDays
        weekDayCount={3}
        week={{
          calories: 8200,
          calorieTarget: 18900,
          adjustedCalories: 8200,
          protein: 780,
          proteinTarget: 1890,
          carbs: 620,
          carbsTarget: 1652,
          fat: 290,
          fatTarget: 490,
          fiber: 84,
        }}
      />,
    );
    expect(screen.getByText('This Week (Mon-Sun)')).toBeInTheDocument();
    expect(screen.getByText('3 days tracked')).toBeInTheDocument();
    expect(screen.queryByText('Today')).not.toBeInTheDocument();
    expect(screen.queryByText('No entry for today')).not.toBeInTheDocument();
  });

  it('tapping "Log an extra" swaps it for the inline add-extra control, focused', async () => {
    render(<QuickActionsCard hasDays={false} onAddExtra={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: 'Log an extra' }));

    expect(screen.queryByRole('button', { name: 'Log an extra' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveFocus();
  });

  it('submits the draft and collapses back to the button (R9/R10 — no navigation)', async () => {
    const onAddExtra = vi.fn();
    render(<QuickActionsCard hasDays={false} onAddExtra={onAddExtra} />);
    await userEvent.click(screen.getByRole('button', { name: 'Log an extra' }));
    await userEvent.type(screen.getByLabelText('Name'), 'Red wine');
    await userEvent.type(screen.getByLabelText('Calories'), '125');
    await userEvent.click(screen.getByRole('button', { name: 'Add extra' }));

    expect(onAddExtra).toHaveBeenCalledWith({
      name: 'Red wine',
      calories: 125,
      protein: undefined,
      carbs: undefined,
      fat: undefined,
    });
    expect(screen.getByRole('button', { name: 'Log an extra' })).toBeInTheDocument();
  });

  it('Cancel reverts to the "Log an extra" button without submitting', async () => {
    const onAddExtra = vi.fn();
    render(<QuickActionsCard hasDays={false} onAddExtra={onAddExtra} />);
    await userEvent.click(screen.getByRole('button', { name: 'Log an extra' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onAddExtra).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Log an extra' })).toBeInTheDocument();
  });
});
