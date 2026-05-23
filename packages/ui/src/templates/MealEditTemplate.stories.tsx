import type { Meta, StoryObj } from '@storybook/react';
import { MealEditTemplate } from './MealEditTemplate';

const value = {
  name: 'CHICKEN',
  weight: 100,
  calories: 220,
  fat: 6,
  saturatedFat: 1,
  carbs: 0,
  fiber: 0,
  protein: 42,
};

const meta: Meta<typeof MealEditTemplate> = {
  title: 'Design System/Templates/MealEditTemplate',
  component: MealEditTemplate,
  args: {
    heading: { title: 'LUNCH', profileHref: '/profile' },
    ingredients: {
      title: 'Ingredients',
      items: [{ id: 'i1', title: 'CHICKEN', meta: '220 kcal' }],
    },
    ingredientEntry: {
      value,
      submitLabel: 'Add',
      onChange: () => undefined,
      onSubmit: () => undefined,
    },
  },
};
export default meta;
type Story = StoryObj<typeof MealEditTemplate>;
export const Default: Story = {};
