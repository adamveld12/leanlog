import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { QuickActionsCard } from '../organisms/QuickActionsCard';

describe('QuickActionsCard', () => {
  it('does not show a "Log an extra" button when onAddExtra is omitted', () => {
    render(<QuickActionsCard hasToday={false} hasDays={false} onAction={() => {}} />);
    expect(screen.queryByRole('button', { name: 'Log an extra' })).not.toBeInTheDocument();
  });

  it('shows the "Log an extra" quick action beneath "Log a meal" (R9)', () => {
    render(
      <QuickActionsCard
        hasToday={false}
        hasDays={false}
        onAction={() => {}}
        onAddExtra={() => {}}
      />,
    );
    const buttons = screen.getAllByRole('button');
    expect(buttons[0]).toHaveTextContent('Log a meal');
    expect(buttons[1]).toHaveTextContent('Log an extra');
  });

  it('tapping "Log an extra" swaps it for the inline add-extra control, focused', async () => {
    render(
      <QuickActionsCard
        hasToday={false}
        hasDays={false}
        onAction={() => {}}
        onAddExtra={() => {}}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Log an extra' }));

    expect(screen.queryByRole('button', { name: 'Log an extra' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveFocus();
  });

  it('submits the draft and collapses back to the button (R9/R10 — no navigation)', async () => {
    const onAddExtra = vi.fn();
    render(
      <QuickActionsCard
        hasToday={false}
        hasDays={false}
        onAction={() => {}}
        onAddExtra={onAddExtra}
      />,
    );
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
    render(
      <QuickActionsCard
        hasToday={false}
        hasDays={false}
        onAction={() => {}}
        onAddExtra={onAddExtra}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Log an extra' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onAddExtra).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Log an extra' })).toBeInTheDocument();
  });
});
