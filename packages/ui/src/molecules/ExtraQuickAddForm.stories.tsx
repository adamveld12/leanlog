import type { Meta, StoryObj } from '@storybook/react';
import { ExtraQuickAddForm } from './ExtraQuickAddForm';

const meta: Meta<typeof ExtraQuickAddForm> = {
  title: 'Design System/Molecules/ExtraQuickAddForm',
  component: ExtraQuickAddForm,
  args: {
    submitLabel: 'Add extra',
    onSubmit: () => {},
    onCancel: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof ExtraQuickAddForm>;

export const Add: Story = {};

export const Editing: Story = {
  args: {
    submitLabel: 'Save extra',
    initial: { name: 'Tortilla chips', calories: 150, protein: 0, carbs: 0, fat: 0 },
  },
};

export const EditingWithMacros: Story = {
  args: {
    submitLabel: 'Save extra',
    initial: { name: 'Greek yogurt', calories: 120, protein: 15, carbs: 9, fat: 0 },
  },
};
