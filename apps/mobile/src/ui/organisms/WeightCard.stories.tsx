import type { Meta, StoryObj } from '@storybook/react-native';
import { WeightCard } from './WeightCard';

const points = Array.from({ length: 14 }, (_, i) => ({
  date: `2026-09-${String(23 + (i % 8)).padStart(2, '0')}`,
  value: Math.round((182 - i * 0.15) * 10) / 10,
}));

const meta = {
  title: 'Design System/Organisms/WeightCard',
  component: WeightCard,
  args: {
    points,
    unit: 'lb',
    weeklyChangeText: 'Weekly change: −0.8 lb',
    todayLbs: 180,
    editable: true,
    onSave: () => {},
  },
} satisfies Meta<typeof WeightCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const WithTrend: Story = {};
export const NeedsMoreWeighIns: Story = {
  args: { weeklyChangeText: null, points: points.slice(0, 1) },
};
