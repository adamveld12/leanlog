import type { Meta, StoryObj } from '@storybook/react-native';
import { SavedFoodPickerCard } from './SavedFoodPickerCard';

const food = {
  id: 'f1',
  name: 'Oats',
  referenceGrams: 100,
  calories: 380,
  fat: 7,
  saturatedFat: 1.2,
  carbs: 67,
  fiber: 10,
  protein: 13,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
};

const meta = {
  title: 'Design System/Organisms/SavedFoodPickerCard',
  component: SavedFoodPickerCard,
  args: { foods: [food, { ...food, id: 'f2', name: 'Eggs', calories: 143 }], onAdd: () => {} },
} satisfies Meta<typeof SavedFoodPickerCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { args: { foods: [] } };
