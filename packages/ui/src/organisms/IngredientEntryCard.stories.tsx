import type { Meta, StoryObj } from '@storybook/react';
import { IngredientEntryCard } from './IngredientEntryCard';

const base = {
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

const meta: Meta<typeof IngredientEntryCard> = {
  title: 'Design System/Organisms/IngredientEntryCard',
  component: IngredientEntryCard,
  args: {
    value: base,
    estimatedCalories: 222,
    adjustedCalories: 222,
    submitLabel: 'Add',
    onChange: () => {},
    onSubmit: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof IngredientEntryCard>;

export const Add: Story = {};

export const FiberAdjusted: Story = {
  args: {
    value: { ...base, carbs: 20, fiber: 5 },
    estimatedCalories: 302,
    adjustedCalories: 292,
  },
};

export const Empty: Story = {
  args: {
    estimatedCalories: 0,
    adjustedCalories: 0,
    value: {
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
    },
  },
};

export const Update: Story = {
  args: { submitLabel: 'Update' },
};

export const Editing: Story = {
  args: { submitLabel: 'Update', onCancel: () => {} },
};

export const FiberError: Story = {
  args: {
    // fat6*9=54 + protein42*4=168 + carbs5*4=20 = 242
    estimatedCalories: 242,
    // adjusted: fiber clamped to carbs(5), digestible=0 => 54+168+0+5*2=232
    adjustedCalories: 232,
    value: {
      ...base,
      carbs: 5,
      fiber: 8,
    },
  },
};
