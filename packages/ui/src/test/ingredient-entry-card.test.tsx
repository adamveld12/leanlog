import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { IngredientEntryCard, type IngredientEntryValue } from '../organisms/IngredientEntryCard';

const base: IngredientEntryValue = {
  name: 'CHICKEN',
  weight: 120,
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
    expect(screen.getByLabelText('Ingredient Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Weight (g)')).toBeInTheDocument();
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

  it('does not render a calories input', () => {
    render(
      <IngredientEntryCard
        value={base}
        onChange={() => {}}
        onSubmit={() => {}}
        submitLabel="Add"
      />,
    );
    expect(screen.queryByLabelText('Calories')).not.toBeInTheDocument();
  });

  it('renders calculated calories text', () => {
    // base: fat=6, carbs=0, fiber=0, protein=42
    // calories = 6*9 + 42*4 + max(0, 0-0)*4 = 54 + 168 + 0 = 222
    render(
      <IngredientEntryCard
        value={base}
        onChange={() => {}}
        onSubmit={() => {}}
        submitLabel="Add"
      />,
    );
    expect(screen.getByText(/Calculated calories: 222 kcal/)).toBeInTheDocument();
  });

  it('recalculates calories when macros change (fiber reduces net carbs)', async () => {
    render(<Harness onSubmit={() => {}} />);

    const carbs = screen.getByLabelText('Carbs');
    const fiber = screen.getByLabelText('Fiber');

    await userEvent.clear(carbs);
    await userEvent.type(carbs, '20');
    await userEvent.tab();
    await userEvent.clear(fiber);
    await userEvent.type(fiber, '5');
    await userEvent.tab();

    // fat=6, carbs=20, fiber=5, protein=42
    // netCarbs = 20 - 5 = 15, calories = 6*9 + 42*4 + 15*4 = 54 + 168 + 60 = 282
    expect(screen.getByText(/Calculated calories: 282 kcal/)).toBeInTheDocument();
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

    await userEvent.type(screen.getByLabelText('Ingredient Name'), '{enter}');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('renders a Cancel button when onCancel is provided and fires it without submitting', async () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();
    render(
      <IngredientEntryCard
        value={base}
        onChange={() => {}}
        onSubmit={onSubmit}
        onCancel={onCancel}
        submitLabel="Update"
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('does not render a Cancel button without onCancel', () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
  });
});
