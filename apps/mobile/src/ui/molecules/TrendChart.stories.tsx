import type { Meta, StoryObj } from '@storybook/react-native';
import { TrendChart } from './TrendChart';

const points = Array.from({ length: 14 }, (_, i) => ({
  date: `2026-09-${String(23 + (i % 8)).padStart(2, '0')}`,
  value: 182 - i * 0.15,
}));

const meta = {
  title: 'Design System/Molecules/TrendChart',
  component: TrendChart,
  args: { title: 'Weight', points, unit: 'lb' },
} satisfies Meta<typeof TrendChart>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Weight: Story = {};
export const NeedsMoreData: Story = { args: { points: points.slice(0, 1) } };
