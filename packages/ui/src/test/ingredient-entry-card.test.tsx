import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { IngredientEntryCard, type IngredientEntryValue } from '../organisms/IngredientEntryCard';

/** Mirrors the estimateCalories formula from @leanlog/data-access */
function estimateCalories(v: {
  fat: number | null;
  carbs: number | null;
  protein: number | null;
  fiber: number | null;
  sugarAlcohol?: number | null;
  allulose?: number | null;
  alcohol?: number | null;
}): number {
  const fat = v.fat ?? 0;
  const carbs = v.carbs ?? 0;
  const fiber = Math.min(v.fiber ?? 0, carbs);
  const protein = v.protein ?? 0;
  const netCarbs = carbs - fiber;
  return Math.round((fat * 9 + protein * 4 + netCarbs * 4 + fiber * 2) * 10) / 10;
}

const base: IngredientEntryValue = {
  name: 'CHICKEN',
  weight: 120,
  calories: null,
  fat: 6,
  saturatedFat: 1.5,
  carbs: 0,
  fiber: 0,
  protein: 42,
  sugarAlcohol: null,
  allulose: null,
  alcohol: null,
};

function Harness({
  onSubmit,
  submitLabel = 'Add' as const,
}: {
  onSubmit: () => void;
  submitLabel?: 'Add' | 'Update';
}) {
  const [value, setValue] = useState(base);
  const estimated = estimateCalories({
    fat: value.fat,
    carbs: value.carbs,
    protein: value.protein,
    fiber: value.fiber,
    sugarAlcohol: value.sugarAlcohol,
    allulose: value.allulose,
    alcohol: value.alcohol,
  });
  return (
    <IngredientEntryCard
      value={value}
      estimatedCalories={estimated}
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
        estimatedCalories={222}
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
        estimatedCalories={222}
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
        estimatedCalories={222}
        onChange={() => {}}
        onSubmit={() => {}}
        submitLabel="Add"
      />,
    );
    expect(screen.queryByLabelText('Calories')).not.toBeInTheDocument();
  });

  it('shows the estimate as the calories placeholder', () => {
    // base: fat=6, carbs=0, fiber=0, protein=42 → estimate 222
    render(
      <IngredientEntryCard
        value={base}
        estimatedCalories={222}
        onChange={() => {}}
        onSubmit={() => {}}
        submitLabel="Add"
      />,
    );
    expect(screen.getByLabelText('Calories (kcal)')).toHaveAttribute(
      'placeholder',
      'Estimated calories: 222',
    );
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
    // netCarbs = 20 - 5 = 15, estimatedCalories = 6*9 + 42*4 + 15*4 + 5*2 = 54 + 168 + 60 + 10 = 292
    expect(screen.getByLabelText('Calories (kcal)')).toHaveAttribute(
      'placeholder',
      'Estimated calories: 292',
    );
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
        estimatedCalories={222}
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

  it('starts with empty numeric fields when values are null', () => {
    render(
      <IngredientEntryCard
        value={{
          name: '',
          weight: null,
          calories: null,
          fat: null,
          saturatedFat: null,
          carbs: null,
          fiber: null,
          protein: null,
          sugarAlcohol: null,
          allulose: null,
          alcohol: null,
        }}
        estimatedCalories={0}
        onChange={() => {}}
        onSubmit={() => {}}
        submitLabel="Add"
      />,
    );

    expect(screen.getByLabelText('Weight (g)')).toHaveValue('');
    expect(screen.getByLabelText('Fat')).toHaveValue('');
    expect(screen.getByLabelText('Protein')).toHaveValue('');
    // No estimate (no macros) → plain placeholder and Add is blocked until
    // calories or a macro is entered.
    expect(screen.getByLabelText('Calories (kcal)')).toHaveAttribute('placeholder', 'Calories');
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
  });

  it('leaves a cleared field empty instead of writing 0', async () => {
    render(<Harness onSubmit={() => {}} />);

    const weight = screen.getByLabelText('Weight (g)');
    await userEvent.clear(weight);
    await userEvent.tab();
    expect(weight).toHaveValue('');
  });

  it('does not render a Cancel button without onCancel', () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
  });

  it('adds a micronutrient row with amount, unit, and %DV inputs', async () => {
    render(<Harness onSubmit={() => {}} />);
    // No rows until you add one.
    expect(screen.queryByLabelText('% DV')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Add row' }));
    expect(screen.getByPlaceholderText('e.g. Sodium')).toBeInTheDocument();
    expect(screen.getByLabelText('Amount')).toBeInTheDocument();
    expect(screen.getByLabelText('% DV')).toBeInTheDocument();
    // Unit defaults to mg.
    expect(screen.getByLabelText('Unit')).toHaveValue('milligram');
  });

  it('renders existing micronutrient rows from the value', () => {
    render(
      <IngredientEntryCard
        value={{ ...base, micronutrients: [{ name: 'Sodium', amount: 60, unit: 'milligram' }] }}
        estimatedCalories={222}
        onChange={() => {}}
        onSubmit={() => {}}
        submitLabel="Add"
      />,
    );
    expect(screen.getByDisplayValue('Sodium')).toBeInTheDocument();
  });
});
