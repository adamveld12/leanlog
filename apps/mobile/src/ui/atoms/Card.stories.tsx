import type { Meta, StoryObj } from '@storybook/react-native';
import { Card } from './Card';
import { Text } from './Text';

const meta = {
  title: 'Design System/Atoms/Card',
  component: Card,
  args: { children: null },
} satisfies Meta<typeof Card>;
export default meta;
type Story = StoryObj<typeof meta>;

export const WithTitle: Story = {
  args: { title: 'Breakfast', children: <Text>Oats 50 g</Text> },
};

export const WithHeaderSlot: Story = {
  args: {
    title: 'Lunch',
    headerNote: '720 kcal',
    headerAction: { label: 'Edit', onPress: () => {} },
    children: <Text>Rice 200 g</Text>,
  },
};
