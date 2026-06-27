import type { Meta, StoryObj } from '@storybook/react';
import { StatsTemplate } from './StatsTemplate';
import { WeightTrendCard } from '../organisms/WeightTrendCard';
import { MeasurementTrendCard } from '../organisms/MeasurementTrendCard';

const NOW = new Date(2026, 4, 28); // 2026-05-28

const WEIGHTS = [
  { date: '2026-05-01', weightLbs: 188 },
  { date: '2026-05-14', weightLbs: 183 },
  { date: '2026-05-28', weightLbs: 179 },
];
const V_TAPER = [
  { date: '2026-05-01', value: 1.5 },
  { date: '2026-05-14', value: 1.56 },
  { date: '2026-05-28', value: 1.62 },
];
const SHOULDER = [
  { date: '2026-05-01', value: 51 },
  { date: '2026-05-14', value: 51.5 },
  { date: '2026-05-28', value: 51.8 },
];
const WAIST = [
  { date: '2026-05-01', value: 34 },
  { date: '2026-05-14', value: 33 },
  { date: '2026-05-28', value: 32 },
];
const BICEP = [
  { date: '2026-05-01', value: 15 },
  { date: '2026-05-14', value: 15.3 },
  { date: '2026-05-28', value: 15.5 },
];
const THIGH = [
  { date: '2026-05-01', value: 23 },
  { date: '2026-05-14', value: 23.3 },
  { date: '2026-05-28', value: 23.6 },
];

const meta: Meta<typeof StatsTemplate> = {
  title: 'Design System/Templates/StatsTemplate',
  component: StatsTemplate,
  args: {
    heading: {
      title: 'Stats',
      navLinks: [
        { href: '/track', label: 'Execute' },
        { href: '/track/stats', label: 'Stats' },
        { href: '/track/goals', label: 'Goals' },
      ],
      renderNavLink: ({ href, label, className }) => (
        <a className={className} href={href}>
          {label}
        </a>
      ),
    },
    weightTrend: (
      <WeightTrendCard entries={WEIGHTS} goalWeightLbs={175} defaultRange="all" now={NOW} />
    ),
    measurementTrend: (
      <MeasurementTrendCard
        vTaperEntries={V_TAPER}
        shoulderEntries={SHOULDER}
        waistEntries={WAIST}
        bicepEntries={BICEP}
        thighEntries={THIGH}
        defaultRange="all"
        now={NOW}
      />
    ),
  },
};
export default meta;
type Story = StoryObj<typeof StatsTemplate>;
export const Default: Story = {};
