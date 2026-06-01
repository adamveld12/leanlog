import type { Meta, StoryObj } from '@storybook/react';
import { Input } from './Input';

const meta: Meta<typeof Input> = {
  title: 'Design System/Atoms/Input',
  component: Input,
  args: { placeholder: 'Protein (g)' },
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {};
export const Disabled: Story = { args: { disabled: true, defaultValue: '30' } };
