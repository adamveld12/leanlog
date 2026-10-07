import type { Meta, StoryObj } from '@storybook/react-native';
import { MacroTotals } from './MacroTotals';

const meta = {
  title: 'Design System/Molecules/MacroTotals',
  component: MacroTotals,
  args: { consumed: { calories: 1240, protein: 88, carbs: 120, fat: 41 }, targets: null },
} satisfies Meta<typeof MacroTotals>;
export default meta;
type Story = StoryObj<typeof meta>;

export const WithTargets: Story = {
  args: { targets: { calories: 2897, protein: 140, carbs: 444, fat: 62 } },
};
export const NoTargets: Story = {};
