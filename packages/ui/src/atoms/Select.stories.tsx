import type { Meta, StoryObj } from '@storybook/react';
import { Select } from './Select';

const meta: Meta<typeof Select> = {
  title: 'Design System/Atoms/Select',
  component: Select,
};

export default meta;
type Story = StoryObj<typeof Select>;

export const Default: Story = {
  args: {
    children: (
      <>
        <option value="">Choose a unit...</option>
        <option value="g">Grams (g)</option>
        <option value="ml">Millilitres (ml)</option>
        <option value="oz">Ounces (oz)</option>
      </>
    ),
  },
};

export const WithSelectedValue: Story = {
  args: {
    defaultValue: 'g',
    children: (
      <>
        <option value="g">Grams (g)</option>
        <option value="ml">Millilitres (ml)</option>
        <option value="oz">Ounces (oz)</option>
      </>
    ),
  },
};
