import type { Meta, StoryObj } from '@storybook/react-native';
import { MealCard } from './MealCard';

const ingredients = [
  { id: '1', name: 'Oats', grams: 50, calories: 190 },
  { id: '2', name: 'Eggs', grams: 100, calories: 143 },
];

const meta = {
  title: 'Design System/Organisms/MealCard',
  component: MealCard,
  args: { name: 'Breakfast', totalCalories: 333, ingredients },
} satisfies Meta<typeof MealCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Editable: Story = { args: { onAddFood: () => {}, onRemoveIngredient: () => {} } };
export const ReadOnly: Story = {};
export const Empty: Story = { args: { ingredients: [], totalCalories: 0, onAddFood: () => {} } };
