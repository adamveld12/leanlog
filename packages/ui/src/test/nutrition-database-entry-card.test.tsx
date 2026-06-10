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
  servingAmount: 0,
  fat: 0,
  carbs: 0,
  protein: 0,
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
}: {
  initial?: NutritionDatabaseEntryValue;
  onSubmit?: () => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <NutritionDatabaseEntryCard
      value={value}
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

  it('renders calculated calories text for basic macros without fiber', () => {
    // fat=3.6, carbs=0, protein=31, fiber=null
    // calories = 3.6*9 + 31*4 + max(0, 0-0)*4 = 32.4 + 124 + 0 = 156.4
    render(
      <NutritionDatabaseEntryCard
        value={filledValue}
        onChange={() => {}}
        onSubmit={() => {}}
      />,
    );
    expect(screen.getByText(/Calculated calories: 156.4 kcal/)).toBeInTheDocument();
  });

  it('fiber reduces net carbs in calorie calculation', () => {
    // fat=0, carbs=20, protein=0, fiber=5
    // netCarbs = 20-5=15, calories = 0 + 0 + 15*4 = 60
    render(
      <NutritionDatabaseEntryCard
        value={{ ...emptyValue, carbs: 20, fiber: 5 }}
        onChange={() => {}}
        onSubmit={() => {}}
      />,
    );
    expect(screen.getByText(/Calculated calories: 60 kcal/)).toBeInTheDocument();
  });

  it('Publish button is disabled when name is missing', () => {
    render(<Harness initial={{ ...filledValue, name: '' }} />);
    expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled();
  });

  it('Publish button is disabled when servingAmount is 0', () => {
    render(<Harness initial={{ ...filledValue, servingAmount: 0 }} />);
    expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled();
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

  it('accepts %DV values over 100 (e.g. 120)', async () => {
    render(<Harness initial={{ ...filledValue, micronutrients: [{ name: 'Vitamin C', percentDailyValue: 0 }] }} />);
    const dvInput = screen.getByLabelText('% DV');
    await userEvent.clear(dvInput);
    await userEvent.type(dvInput, '120');
    await userEvent.tab();
    // Should not clamp to 100 — %DV up to 999 is allowed
    expect(dvInput).toHaveValue('120');
  });

  it('shows required fields warning when name and servingAmount missing', () => {
    render(<Harness initial={emptyValue} />);
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert.textContent).toMatch(/Name/);
    expect(alert.textContent).toMatch(/Serving amount/);
  });
});
