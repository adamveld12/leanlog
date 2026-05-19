import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AddDayControl } from '../components/AddDayControl';

describe('AddDayControl', () => {
  it('submits selected picker values through onDayAdded', async () => {
    const onDayAdded = vi.fn();
    render(<AddDayControl onDayAdded={onDayAdded} month={5} day={12} year={2024} />);

    const [month, day, year] = screen.getAllByRole('combobox');
    await userEvent.selectOptions(month, '6');
    await userEvent.selectOptions(day, '13');
    await userEvent.selectOptions(year, '2025');

    await userEvent.click(screen.getByRole('button', { name: 'Add day' }));

    expect(onDayAdded).toHaveBeenCalledWith({ month: 6, day: 13, year: 2025 });
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
