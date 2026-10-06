import type { Meta, StoryObj } from '@storybook/react-native';
import { SavedFoodFormCard } from './SavedFoodFormCard';

const meta = {
  title: 'Design System/Organisms/SavedFoodFormCard',
  component: SavedFoodFormCard,
  args: { onSubmit: () => {} },
} satisfies Meta<typeof SavedFoodFormCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const New: Story = {};
export const Editing: Story = {
  args: {
    initial: {
      name: 'Oats',
      referenceGrams: 100,
      calories: 380,
      fat: 7,
      saturatedFat: 1.2,
      carbs: 67,
      fiber: 10,
      protein: 13,
    },
    onDelete: () => {},
  },
};
