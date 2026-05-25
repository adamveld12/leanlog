import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Design System/Atoms/Button',
  component: Button,
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = { args: { children: 'Save', variant: 'primary' } };
export const Ghost: Story = { args: { children: 'Cancel', variant: 'ghost' } };
export const Danger: Story = { args: { children: 'Delete', variant: 'danger' } };
