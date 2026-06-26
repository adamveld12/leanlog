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
const WAIST = [
  { date: '2026-05-01', value: 34 },
  { date: '2026-05-14', value: 33 },
  { date: '2026-05-28', value: 32 },
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
        waistEntries={WAIST}
        defaultRange="all"
        now={NOW}
      />
    ),
  },
};
export default meta;
type Story = StoryObj<typeof StatsTemplate>;
export const Default: Story = {};
