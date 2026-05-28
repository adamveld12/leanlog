import type { Meta, StoryObj } from '@storybook/react';
import { WeightTrendCard } from './WeightTrendCard';

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
  { date: relativeIso(60), weightLbs: 188 },
  { date: relativeIso(45), weightLbs: 186 },
  { date: relativeIso(30), weightLbs: 184 },
  { date: relativeIso(21), weightLbs: 183 },
  { date: relativeIso(14), weightLbs: 182 },
  { date: relativeIso(7), weightLbs: 181 },
  { date: relativeIso(3), weightLbs: 180 },
  { date: relativeIso(1), weightLbs: 179 },
  { date: relativeIso(0), weightLbs: 178.5 },
];

const meta: Meta<typeof WeightTrendCard> = {
  title: 'Design System/Organisms/WeightTrendCard',
  component: WeightTrendCard,
  args: {
    entries: SAMPLE,
    goalWeightLbs: 175,
    defaultRange: '30d',
    now: TODAY,
  },
};

export default meta;
type Story = StoryObj<typeof WeightTrendCard>;

export const Default: Story = {};
export const NoGoal: Story = { args: { goalWeightLbs: null } };
export const Empty: Story = { args: { entries: [] } };
export const SevenDays: Story = { args: { defaultRange: '7d' } };
export const AllTime: Story = { args: { defaultRange: 'all' } };
