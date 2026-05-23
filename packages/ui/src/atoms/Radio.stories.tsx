import type { Meta, StoryObj } from '@storybook/react';
import { Radio } from './Radio';

const meta: Meta<typeof Radio> = {
  title: 'Design System/Atoms/Radio',
  component: Radio,
  args: { name: 'demo-radio', value: 'a', checked: true, 'aria-label': 'Option A' },
};
export default meta;
type Story = StoryObj<typeof Radio>;
export const Default: Story = {};
