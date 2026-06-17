import type { Meta, StoryObj } from '@storybook/react';
import { SuccessText } from './SuccessText';

const meta: Meta<typeof SuccessText> = {
  title: 'Design System/Atoms/SuccessText',
  component: SuccessText,
  args: {
    children: 'Goal created',
  },
};

export default meta;
type Story = StoryObj<typeof SuccessText>;

export const Default: Story = {};
