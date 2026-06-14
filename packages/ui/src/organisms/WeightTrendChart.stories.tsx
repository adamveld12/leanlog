import type { Meta, StoryObj } from '@storybook/react';
import WeightTrendChart from './WeightTrendChart';

const TODAY = new Date(2026, 4, 28); // 2026-05-28

function relativeIso(daysAgo: number): string {
  const d = new Date(TODAY);
  d.setDate(d.getDate() - daysAgo);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const SAMPLE = [
  { date: relativeIso(30), weightLbs: 184 },
  { date: relativeIso(21), weightLbs: 183 },
  { date: relativeIso(14), weightLbs: 182 },
  { date: relativeIso(7), weightLbs: 181 },
  { date: relativeIso(3), weightLbs: 180 },
  { date: relativeIso(0), weightLbs: 178.5 },
];

const TOKENS = { text: '#151515', muted: '#606060', line: '#e8e8e8' };

const meta: Meta<typeof WeightTrendChart> = {
  title: 'Design System/Organisms/WeightTrendChart',
  component: WeightTrendChart,
  // The chart is absolutely positioned to fill its container; give it a sized box.
  decorators: [
    (Story) => (
      <div className="relative h-56 w-full">
        <Story />
      </div>
    ),
  ],
  args: {
    entries: SAMPLE,
    goalWeightLbs: 175,
    tokens: TOKENS,
    ariaLabel: 'Weight trend chart over the last 30d, 6 entries',
  },
};

export default meta;
type Story = StoryObj<typeof WeightTrendChart>;

export const Default: Story = {};
export const NoGoal: Story = { args: { goalWeightLbs: null } };
