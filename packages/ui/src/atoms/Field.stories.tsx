import type { Meta, StoryObj } from '@storybook/react';
import { Field } from './Field';
import { Input } from './Input';

const meta: Meta<typeof Field> = {
  title: 'Design System/Atoms/Field',
  component: Field,
};

export default meta;
type Story = StoryObj<typeof Field>;

export const Default: Story = {
  args: {
    label: 'Protein (g)',
    children: <Input placeholder="e.g. 30" />,
  },
};

export const WithHelperText: Story = {
  args: {
    label: 'Calories',
    helperText: 'Enter the total calories for this meal.',
    children: <Input placeholder="e.g. 500" />,
  },
};

export const WithWarning: Story = {
  args: {
    label: 'Fat (g)',
    errorText: 'Value must be a positive number.',
    children: <Input placeholder="e.g. 12" />,
  },
};
