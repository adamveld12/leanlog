import type { Meta, StoryObj } from '@storybook/react';
import MeasurementTrendChart from './MeasurementTrendChart';

const V_TAPER = [
  { date: '2026-05-01', value: 1.5 },
  { date: '2026-05-08', value: 1.53 },
  { date: '2026-05-15', value: 1.56 },
  { date: '2026-05-22', value: 1.59 },
  { date: '2026-05-29', value: 1.62 },
];

const WAIST = [
  { date: '2026-05-01', value: 34 },
  { date: '2026-05-08', value: 33.5 },
  { date: '2026-05-15', value: 33 },
  { date: '2026-05-22', value: 32.5 },
  { date: '2026-05-29', value: 32 },
];

const TOKENS = { text: '#151515', muted: '#606060', line: '#e8e8e8' };

const meta: Meta<typeof MeasurementTrendChart> = {
  title: 'Design System/Organisms/MeasurementTrendChart',
  component: MeasurementTrendChart,
  // The chart is absolutely positioned to fill its container; give it a sized box.
  decorators: [
    (Story) => (
      <div className="relative h-56 w-full">
        <Story />
      </div>
    ),
  ],
  args: {
    entries: V_TAPER,
    tokens: TOKENS,
    unit: '',
    precision: 2,
    minPad: 0.05,
    ariaLabel: 'v-taper trend chart over all time, 5 entries',
  },
};

export default meta;
type Story = StoryObj<typeof MeasurementTrendChart>;

export const VTaper: Story = {};
export const Waist: Story = {
  args: {
    entries: WAIST,
    unit: 'in',
    precision: 1,
    minPad: 1,
    ariaLabel: 'waist trend chart over all time, 5 entries',
  },
};
