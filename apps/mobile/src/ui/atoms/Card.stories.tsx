import type { Meta, StoryObj } from '@storybook/react-native';
import { Button } from './Button';
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
    headerEnd: <Text variant="helper">720 kcal</Text>,
    children: <Button variant="secondary" label="+ Add food" />,
  },
};
