import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { IngredientEntryCard, type IngredientEntryValue } from '../organisms/IngredientEntryCard';

type MacroInput = {
  fat: number | null;
  carbs: number | null;
  protein: number | null;
  fiber: number | null;
  sugarAlcohol?: number | null;
  allulose?: number | null;
  alcohol?: number | null;
};

// @leanlog/ui has no dependency on @leanlog/data-access, so these mirror
// estimateCalories/fiberAdjustedCalories from packages/data-access/src/calculations.ts.
// Keep in sync with that module.
function estimateCalories(v: MacroInput): number {
  const fat = v.fat ?? 0;
  const carbs = v.carbs ?? 0;
  const protein = v.protein ?? 0;
  return (
    Math.round((fat * 9 + protein * 4 + carbs * 4 + Math.max(0, v.alcohol ?? 0) * 7) * 10) / 10
  );
}

function fiberAdjustedCalories(v: MacroInput): number {
  const fat = v.fat ?? 0;
  const carbs = v.carbs ?? 0;
  const protein = v.protein ?? 0;
  const fiberC = Math.min(Math.max(0, v.fiber ?? 0), carbs);
  const saC = Math.min(Math.max(0, v.sugarAlcohol ?? 0), carbs - fiberC);
  const alluC = Math.min(Math.max(0, v.allulose ?? 0), carbs - fiberC - saC);
  const digestible = carbs - fiberC - saC - alluC;
  return (
    Math.round(
      (fat * 9 +
        protein * 4 +
        digestible * 4 +
        fiberC * 2 +
        saC * 2.4 +
        alluC * 0.4 +
        Math.max(0, v.alcohol ?? 0) * 7) *
        10,
    ) / 10
  );
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
  const macros = {
    fat: value.fat,
    carbs: value.carbs,
    protein: value.protein,
    fiber: value.fiber,
    sugarAlcohol: value.sugarAlcohol,
    allulose: value.allulose,
    alcohol: value.alcohol,
  };
  const estimated = estimateCalories(macros);
  const adjusted = fiberAdjustedCalories(macros);
  return (
    <IngredientEntryCard
      value={value}
      estimatedCalories={estimated}
      adjustedCalories={adjusted}
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
        adjustedCalories={222}
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
        adjustedCalories={222}
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
        adjustedCalories={222}
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
        adjustedCalories={222}
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

  it('recalculates calories from total carbs when macros change', async () => {
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
    // estimatedCalories (total carbs) = 6*9 + 42*4 + 20*4 = 54 + 168 + 80 = 302
    // adjusted (fiber discounted) = 6*9 + 42*4 + digestible(20-5=15)*4 + fiber5*2 = 54+168+60+10 = 292
    expect(screen.getByLabelText('Calories (kcal)')).toHaveAttribute(
      'placeholder',
      'Estimated calories: 302 (292 adj)',
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
        adjustedCalories={222}
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
        adjustedCalories={0}
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
        adjustedCalories={222}
        onChange={() => {}}
        onSubmit={() => {}}
        submitLabel="Add"
      />,
    );
    expect(screen.getByDisplayValue('Sodium')).toBeInTheDocument();
  });
});
