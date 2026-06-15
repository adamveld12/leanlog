import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  NutritionDatabaseEntryCard,
  type NutritionDatabaseEntryValue,
} from '../organisms/NutritionDatabaseEntryCard';

const emptyValue: NutritionDatabaseEntryValue = {
  name: '',
  servingAmount: null,
  servingsPerPackage: null,
  calories: null,
  fat: null,
  carbs: null,
  protein: null,
  fiber: null,
  sugar: null,
  saturatedFat: null,
  unsaturatedFat: null,
  monounsaturatedFat: null,
  polyunsaturatedFat: null,
  transFat: null,
  micronutrients: [],
};

const filledValue: NutritionDatabaseEntryValue = {
  name: 'CHICKEN BREAST',
  servingAmount: 100,
  servingsPerPackage: 1,
  calories: 156,
  fat: 3.6,
  carbs: 0,
  protein: 31,
  fiber: null,
  sugar: null,
  saturatedFat: null,
  unsaturatedFat: null,
  monounsaturatedFat: null,
  polyunsaturatedFat: null,
  transFat: null,
  micronutrients: [],
};

function Harness({
  initial = emptyValue,
  onSubmit = () => {},
  estimatedCalories = 0,
}: {
  initial?: NutritionDatabaseEntryValue;
  onSubmit?: () => void;
  estimatedCalories?: number;
}) {
  const [value, setValue] = useState(initial);
  return (
    <NutritionDatabaseEntryCard
      value={value}
      estimatedCalories={estimatedCalories}
      onChange={setValue}
      onSubmit={onSubmit}
    />
  );
}

afterEach(cleanup);

describe('NutritionDatabaseEntryCard', () => {
  it('does not render a calories input', () => {
    render(<Harness />);
    expect(screen.queryByLabelText('Calories')).not.toBeInTheDocument();
  });

  it('renders estimated calories text for basic macros without fiber', () => {
    // fat=3.6, carbs=0, protein=31, fiber=null
    // estimatedCalories = 3.6*9 + 31*4 + max(0, 0-0)*4 = 32.4 + 124 + 0 = 156.4
    render(
      <NutritionDatabaseEntryCard
        value={filledValue}
        estimatedCalories={156.4}
        onChange={() => {}}
        onSubmit={() => {}}
      />,
    );
    expect(screen.getByText(/Estimated calories: 156 kcal/)).toBeInTheDocument();
  });

  it('fiber reduces net carbs in calorie calculation', () => {
    // fat=0, carbs=20, protein=0, fiber=5
    // netCarbs = 15, estimatedCalories = 0 + 0 + 15*4 + 5*2 = 60 + 10 = 70
    render(
      <NutritionDatabaseEntryCard
        value={{ ...emptyValue, carbs: 20, fiber: 5 }}
        estimatedCalories={70}
        onChange={() => {}}
        onSubmit={() => {}}
      />,
    );
    expect(screen.getByText(/Estimated calories: 70 kcal/)).toBeInTheDocument();
  });

  it('Publish button is disabled when name is missing', () => {
    render(<Harness initial={{ ...filledValue, name: '' }} />);
    expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled();
  });

  it('Publish button is disabled when servingAmount is 0', () => {
    render(<Harness initial={{ ...filledValue, servingAmount: 0 }} />);
    expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled();
  });

  it('Publish button is disabled when servings per package is missing (R8)', () => {
    render(<Harness initial={{ ...filledValue, servingsPerPackage: null }} />);
    expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled();
  });

  it('highlights a missing required field red once the form is started (scan prefill)', () => {
    // A scan read the macros/serving but not the name → name input flags red.
    render(<Harness initial={{ ...filledValue, name: '' }} />);
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveClass('border-[var(--ll-danger)]');
  });

  it('does not highlight required fields on a pristine empty form', () => {
    render(<Harness initial={emptyValue} />);
    expect(screen.getByRole('textbox', { name: 'Name' })).not.toHaveClass(
      'border-[var(--ll-danger)]',
    );
    expect(screen.getByLabelText('Serving size')).not.toHaveClass('border-[var(--ll-danger)]');
  });

  it('blocks save when saturated fat exceeds total fat (R5)', () => {
    render(<Harness initial={{ ...filledValue, fat: 1, saturatedFat: 5 }} />);
    expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled();
    expect(screen.getByText(/Saturated fat cannot exceed total fat/)).toBeInTheDocument();
  });

  it('Publish button is enabled when all required fields are filled', () => {
    render(<Harness initial={filledValue} />);
    expect(screen.getByRole('button', { name: 'Publish' })).not.toBeDisabled();
  });

  it('Publish button is disabled when fiber exceeds carbs', () => {
    render(<Harness initial={{ ...filledValue, carbs: 5, fiber: 10 }} />);
    expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled();
    expect(screen.getByText('Fiber cannot exceed carbs.')).toBeInTheDocument();
  });

  it('calls onSubmit when valid and Publish is clicked', async () => {
    const onSubmit = vi.fn();
    render(<Harness initial={filledValue} onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole('button', { name: 'Publish' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('edits a micronutrient with a typed unit and no %DV field (R3/R4)', async () => {
    render(
      <Harness
        initial={{
          ...filledValue,
          micronutrients: [{ name: 'Sodium', amount: 60, unit: 'milligram' }],
        }}
      />,
    );
    // %DV is gone entirely
    expect(screen.queryByLabelText('% DV')).not.toBeInTheDocument();
    // Unit is a typed select, not a free-text input
    const unit = screen.getByLabelText('Unit');
    expect(unit).toHaveValue('milligram');
  });

  it('shows required fields warning when name and servingAmount missing', () => {
    render(<Harness initial={emptyValue} />);
    const alert = screen.getAllByRole('alert')[0];
    expect(alert).toBeInTheDocument();
    expect(alert.textContent).toMatch(/Name/);
    expect(alert.textContent).toMatch(/Serving size/);
  });

  it('starts with empty required inputs and lists null macros as required', () => {
    render(<Harness initial={emptyValue} />);
    expect(screen.getByLabelText('Serving size')).toHaveValue('');
    expect(screen.getByLabelText('Fat (g)')).toHaveValue('');
    expect(screen.getByLabelText('Carbs (g)')).toHaveValue('');
    expect(screen.getByLabelText('Protein (g)')).toHaveValue('');
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toMatch(/Fat/);
    expect(alert.textContent).toMatch(/Carbs/);
    expect(alert.textContent).toMatch(/Protein/);
    expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled();
  });

  it('Publish is disabled when a required macro is cleared', async () => {
    render(<Harness initial={filledValue} />);
    const fat = screen.getByLabelText('Fat (g)');
    await userEvent.clear(fat);
    await userEvent.tab();
    expect(fat).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled();
  });
});
