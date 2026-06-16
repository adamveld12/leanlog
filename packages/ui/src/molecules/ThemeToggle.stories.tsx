import type { Meta, StoryObj } from '@storybook/react';
import { ThemeToggle } from './ThemeToggle';

const meta: Meta<typeof ThemeToggle> = {
  title: 'Design System/Molecules/ThemeToggle',
  component: ThemeToggle,
  args: { value: 'system', onChange: () => {} },
};

export default meta;
type Story = StoryObj<typeof ThemeToggle>;

export const Auto: Story = {};
export const Light: Story = { args: { value: 'light' } };
export const Dark: Story = { args: { value: 'dark' } };
