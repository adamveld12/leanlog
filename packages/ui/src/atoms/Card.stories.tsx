import type { Meta, StoryObj } from '@storybook/react';
import { Card } from './Card';
import { Text } from './Text';

const meta: Meta<typeof Card> = {
  title: 'Design System/Atoms/Card',
  component: Card,
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  args: {
    children: <Text>This is a card with some content inside.</Text>,
  },
};

export const Saved: Story = {
  args: {
    saved: true,
    children: <Text>This card has been saved.</Text>,
  },
};
