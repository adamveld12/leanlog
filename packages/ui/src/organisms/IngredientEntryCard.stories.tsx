import type { Meta, StoryObj } from '@storybook/react';
import { IngredientEntryCard } from './IngredientEntryCard';

const base = {
  name: 'CHICKEN',
  weight: 120,
  fat: 6,
  saturatedFat: 1.5,
  carbs: 0,
  fiber: 0,
  protein: 42,
};

const meta: Meta<typeof IngredientEntryCard> = {
  title: 'Design System/Organisms/IngredientEntryCard',
  component: IngredientEntryCard,
  args: {
    value: base,
    submitLabel: 'Add',
    onChange: () => {},
    onSubmit: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof IngredientEntryCard>;

export const Add: Story = {};

export const Update: Story = {
  args: { submitLabel: 'Update' },
};

export const FiberError: Story = {
  args: {
    value: {
      ...base,
      carbs: 5,
      fiber: 8,
    },
  },
};
