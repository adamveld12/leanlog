import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AddDayControl } from '../organisms/AddDayControl';

describe('AddDayControl', () => {
  it('submits selected picker values and totalMeals through onDayAdded', async () => {
    const onDayAdded = vi.fn();
    render(<AddDayControl onDayAdded={onDayAdded} month={5} day={12} year={2024} totalMeals={6} />);

    const [month, day, year] = screen.getAllByRole('combobox');
    await userEvent.selectOptions(month, '6');
    await userEvent.selectOptions(day, '13');
    await userEvent.selectOptions(year, '2025');

    const totalMealsInput = screen.getByRole('spinbutton');
    await userEvent.clear(totalMealsInput);
    await userEvent.type(totalMealsInput, '7');

    await userEvent.click(screen.getByRole('button', { name: 'Add day' }));

    expect(onDayAdded).toHaveBeenCalledWith({ month: 6, day: 13, year: 2025, totalMeals: 7 });
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

  it('defaults totalMeals to 4 and supports hiding the input', async () => {
    const onDayAdded = vi.fn();
    const { container } = render(<AddDayControl onDayAdded={onDayAdded} hideTotalMealsInput />);

    expect(within(container).queryByText('Total meals for the day')).not.toBeInTheDocument();
    expect(within(container).queryByRole('spinbutton')).not.toBeInTheDocument();

    await userEvent.click(within(container).getByRole('button', { name: 'Add day' }));

    expect(onDayAdded).toHaveBeenCalledWith(expect.objectContaining({ totalMeals: 4 }));
  });
});
