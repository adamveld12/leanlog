import type { Meta, StoryObj } from '@storybook/react-native';
import { TargetBreakdown } from './TargetBreakdown';

const meta = {
  title: 'Design System/Molecules/TargetBreakdown',
  component: TargetBreakdown,
  args: { basis: 'bodyweight', breakdown: null, calorieDelta: 0, targetCalories: 2700 },
} satisfies Meta<typeof TargetBreakdown>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Katch: Story = {
  args: {
    basis: 'katch',
    breakdown: { lbmKg: 69.396, bmr: 1869.05, activityKcal: 1027.98 },
    calorieDelta: -300,
    targetCalories: 2597,
  },
};
export const BodyweightFallback: Story = {};
