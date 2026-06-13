import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AddDayControl } from '../organisms/AddDayControl';

const nextYear = new Date().getFullYear() + 1;

describe('AddDayControl', () => {
  afterEach(cleanup);

  it('submits selected picker values through onDayAdded', async () => {
    const onDayAdded = vi.fn();
    // A future year keeps the Add button enabled (past dates are blocked).
    render(<AddDayControl onDayAdded={onDayAdded} month={5} day={12} year={nextYear} />);

    const [month, day, year] = screen.getAllByRole('combobox');
    await userEvent.selectOptions(month, '6');
    await userEvent.selectOptions(day, '13');
    await userEvent.selectOptions(year, String(nextYear));

    await userEvent.click(screen.getByRole('button', { name: 'Add day' }));

    expect(onDayAdded).toHaveBeenCalledWith({ month: 6, day: 13, year: nextYear });
  });

  it('does not render a meal-count input', () => {
    const { container } = render(
      <AddDayControl onDayAdded={() => undefined} month={1} day={1} year={nextYear} />,
    );
    expect(within(container).queryByRole('spinbutton')).not.toBeInTheDocument();
  });

  it('blocks creating a day in the past', async () => {
    const onDayAdded = vi.fn();
    // Year 2000 is unambiguously in the past relative to any test run.
    render(<AddDayControl onDayAdded={onDayAdded} month={1} day={1} year={2000} />);

    const button = screen.getByRole('button', { name: 'Add day' });
    expect(button).toBeDisabled();
    expect(screen.getByText('You can only create days for today or later.')).toBeInTheDocument();
  });

  it('supports copy overrides and disabled button state', () => {
    render(
      <AddDayControl
        onDayAdded={() => undefined}
        title="Create log day"
        note="Pick a date to begin logging."
        buttonLabel="Create day"
        disabled
      />,
    );

    expect(screen.getByText('Create log day')).toBeInTheDocument();
    expect(screen.getByText('Pick a date to begin logging.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create day' })).toBeDisabled();
  });
});
