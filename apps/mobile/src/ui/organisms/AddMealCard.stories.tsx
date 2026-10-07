import type { Meta, StoryObj } from '@storybook/react-native';
import { AddMealCard } from './AddMealCard';

const meta = {
  title: 'Design System/Organisms/AddMealCard',
  component: AddMealCard,
  args: { onAdd: () => {} },
} satisfies Meta<typeof AddMealCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
