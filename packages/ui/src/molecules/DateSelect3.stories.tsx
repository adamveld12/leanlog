import type { Meta, StoryObj } from '@storybook/react';
import { DateSelect3 } from './DateSelect3';

const meta: Meta<typeof DateSelect3> = {
  title: 'Design System/Molecules/DateSelect3',
  component: DateSelect3,
  args: {
    month: 5,
    day: 24,
    year: new Date().getFullYear(),
    onChange: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof DateSelect3>;

export const Default: Story = {};

export const BeginningOfYear: Story = {
  args: {
    month: 1,
    day: 1,
    year: new Date().getFullYear(),
  },
};
