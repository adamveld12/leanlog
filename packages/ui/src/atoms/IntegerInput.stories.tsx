import type { Meta, StoryObj } from '@storybook/react';
import { IntegerInput } from './IntegerInput';

const meta: Meta<typeof IntegerInput> = {
  title: 'Design System/Atoms/IntegerInput',
  component: IntegerInput,
  args: { value: 4, onChange: () => undefined, min: 0, step: 1 },
};
export default meta;
type Story = StoryObj<typeof IntegerInput>;
export const Default: Story = {};
