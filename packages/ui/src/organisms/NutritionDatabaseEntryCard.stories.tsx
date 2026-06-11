import type { Meta, StoryObj } from '@storybook/react';
import { NutritionDatabaseEntryCard } from './NutritionDatabaseEntryCard';

const base = {
  name: '',
  servingAmount: 0,
  calories: null,
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

const filled = {
  name: 'CHICKEN BREAST',
  servingAmount: 100,
  calories: null,
  fat: 3.6,
  carbs: 0,
  protein: 31,
  fiber: null,
  sugar: null,
  saturatedFat: 1,
  unsaturatedFat: null,
  monounsaturatedFat: null,
  polyunsaturatedFat: null,
  transFat: null,
  micronutrients: [],
};

const meta: Meta<typeof NutritionDatabaseEntryCard> = {
  title: 'Design System/Organisms/NutritionDatabaseEntryCard',
  component: NutritionDatabaseEntryCard,
  args: {
    value: base,
    estimatedCalories: 0,
    onChange: () => {},
    onSubmit: () => {},
    submitting: false,
  },
};

export default meta;
type Story = StoryObj<typeof NutritionDatabaseEntryCard>;

export const Default: Story = {};

export const Filled: Story = {
  args: {
    value: filled,
  },
};

export const Submitting: Story = {
  args: {
    value: filled,
    submitting: true,
  },
};

export const ValidationError: Story = {
  args: {
    value: {
      ...base,
      name: '',
      servingAmount: 0,
    },
  },
};

export const FiberError: Story = {
  args: {
    value: {
      ...filled,
      carbs: 5,
      fiber: 10,
    },
  },
};

export const WithMicronutrients: Story = {
  args: {
    value: {
      ...filled,
      micronutrients: [
        { name: 'Vitamin C', percentDailyValue: 120, amount: 108, unit: 'mg' },
        { name: 'Iron', percentDailyValue: 15, amount: 2.7, unit: 'mg' },
      ],
    },
  },
};
