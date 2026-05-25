import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { IngredientEntryCard, type IngredientEntryValue } from '../organisms/IngredientEntryCard';

const base: IngredientEntryValue = {
  name: 'CHICKEN',
  weight: 120,
  calories: 220,
  fat: 6,
  saturatedFat: 1.5,
  carbs: 0,
  fiber: 0,
  protein: 42,
};

function Harness({
  onSubmit,
  submitLabel = 'Add' as const,
}: {
  onSubmit: () => void;
  submitLabel?: 'Add' | 'Update';
}) {
  const [value, setValue] = useState(base);
  return (
    <IngredientEntryCard
      value={value}
      onChange={setValue}
      onSubmit={onSubmit}
      submitLabel={submitLabel}
    />
  );
}

afterEach(cleanup);

describe('IngredientEntryCard', () => {
  it('renders fields and Add/Update button labels', () => {
    const { rerender } = render(
      <IngredientEntryCard
        value={base}
        onChange={() => {}}
        onSubmit={() => {}}
        submitLabel="Add"
      />,
    );

    expect(screen.getByText('Ingredient Entry')).toBeInTheDocument();
    expect(screen.getByLabelText('Ingredient title')).toBeInTheDocument();
    expect(screen.getByLabelText('Weight (g)')).toBeInTheDocument();
    expect(screen.getByLabelText('Calories')).toBeInTheDocument();
    expect(screen.getByLabelText('Fat')).toBeInTheDocument();
    expect(screen.getByLabelText('Saturated fat')).toBeInTheDocument();
    expect(screen.getByLabelText('Carbs')).toBeInTheDocument();
    expect(screen.getByLabelText('Fiber')).toBeInTheDocument();
    expect(screen.getByLabelText('Protein')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();

    rerender(
      <IngredientEntryCard
        value={base}
        onChange={() => {}}
        onSubmit={() => {}}
        submitLabel="Update"
      />,
    );
    expect(screen.getByRole('button', { name: 'Update' })).toBeInTheDocument();
  });

  it('enforces limits, rounds to 1 decimal, and validates fiber <= carbs', async () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);

    const weight = screen.getByLabelText('Weight (g)');
    await userEvent.clear(weight);
    await userEvent.type(weight, '1000');
    await userEvent.tab();
    expect(weight).toHaveValue('999');

    const protein = screen.getByLabelText('Protein');
    await userEvent.clear(protein);
    await userEvent.type(protein, '1.26');
    await userEvent.tab();
    expect(protein).toHaveValue('1.3');

    const carbs = screen.getByLabelText('Carbs');
    const fiber = screen.getByLabelText('Fiber');
    await userEvent.clear(carbs);
    await userEvent.type(carbs, '10');
    await userEvent.tab();
    await userEvent.clear(fiber);
    await userEvent.type(fiber, '12');
    await userEvent.tab();

    expect(screen.getByText('Fiber cannot exceed carbs.')).toBeInTheDocument();
    expect(fiber.className).toContain('border-[var(--ll-danger)]');

    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(onSubmit).not.toHaveBeenCalled();

    await userEvent.clear(fiber);
    await userEvent.type(fiber, '9');
    await userEvent.tab();
    expect(screen.queryByText('Fiber cannot exceed carbs.')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('does not submit on Enter key in ingredient title', async () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText('Ingredient title'), '{enter}');
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
