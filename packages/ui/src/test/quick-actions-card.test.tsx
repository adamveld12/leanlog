import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { QuickActionsCard } from '../organisms/QuickActionsCard';

describe('QuickActionsCard', () => {
  it('does not show a "Log an extra" button when onAddExtra is omitted', () => {
    render(<QuickActionsCard hasToday={false} hasDays={false} onAction={() => {}} />);
    expect(screen.queryByRole('button', { name: 'Log an extra' })).not.toBeInTheDocument();
  });

  it('shows and fires the "Log an extra" quick action beneath "Log a meal" (R9)', async () => {
    const onAddExtra = vi.fn();
    render(
      <QuickActionsCard
        hasToday={false}
        hasDays={false}
        onAction={() => {}}
        onAddExtra={onAddExtra}
      />,
    );
    const buttons = screen.getAllByRole('button');
    expect(buttons[0]).toHaveTextContent('Log a meal');
    expect(buttons[1]).toHaveTextContent('Log an extra');

    await userEvent.click(screen.getByRole('button', { name: 'Log an extra' }));
    expect(onAddExtra).toHaveBeenCalledTimes(1);
  });
});
