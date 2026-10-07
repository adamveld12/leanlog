import type { Meta, StoryObj } from '@storybook/react-native';
import { ProgressBar } from './ProgressBar';

const meta = {
  title: 'Design System/Atoms/ProgressBar',
  component: ProgressBar,
  args: { label: 'Calories', value: 1240, max: 2897 },
} satisfies Meta<typeof ProgressBar>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Partial: Story = {};
export const OverTarget: Story = { args: { value: 3100 } };
