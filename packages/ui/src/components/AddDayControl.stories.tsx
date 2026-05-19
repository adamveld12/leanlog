import type { Meta, StoryObj } from '@storybook/react';
import { AddDayControl } from './AddDayControl';

const meta: Meta<typeof AddDayControl> = {
  title: 'Components/AddDayControl',
  component: AddDayControl,
  args: {
    onDayAdded: () => undefined,
  },
};

export default meta;
type Story = StoryObj<typeof AddDayControl>;

export const Default: Story = {};

export const CustomCopy: Story = {
  args: {
    title: 'Create log day',
    note: 'Pick a date to start logging meals for that day.',
    buttonLabel: 'Create day',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};
