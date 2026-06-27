import type { Meta, StoryObj } from '@storybook/react';
import { MeasurementTrendCard } from './MeasurementTrendCard';

const V_TAPER = [
  { date: '2026-05-01', value: 1.5 },
  { date: '2026-05-08', value: 1.52 },
  { date: '2026-05-15', value: 1.55 },
  { date: '2026-05-22', value: 1.58 },
  { date: '2026-05-29', value: 1.61 },
];

const SHOULDER = [
  { date: '2026-05-01', value: 51 },
  { date: '2026-05-08', value: 51.3 },
  { date: '2026-05-15', value: 51.5 },
  { date: '2026-05-22', value: 51.6 },
  { date: '2026-05-29', value: 51.8 },
];

const WAIST = [
  { date: '2026-05-01', value: 34 },
  { date: '2026-05-08', value: 33.5 },
  { date: '2026-05-15', value: 33 },
  { date: '2026-05-22', value: 32.5 },
  { date: '2026-05-29', value: 32 },
];

const BICEP = [
  { date: '2026-05-01', value: 15 },
  { date: '2026-05-08', value: 15.1 },
  { date: '2026-05-15', value: 15.3 },
  { date: '2026-05-22', value: 15.4 },
  { date: '2026-05-29', value: 15.5 },
];

const THIGH = [
  { date: '2026-05-01', value: 23 },
  { date: '2026-05-08', value: 23.2 },
  { date: '2026-05-15', value: 23.3 },
  { date: '2026-05-22', value: 23.5 },
  { date: '2026-05-29', value: 23.6 },
];

const NOW = new Date('2026-05-30T12:00:00');

const meta: Meta<typeof MeasurementTrendCard> = {
  title: 'Design System/Organisms/MeasurementTrendCard',
  component: MeasurementTrendCard,
  args: { now: NOW, defaultRange: 'all' },
};

export default meta;
type Story = StoryObj<typeof MeasurementTrendCard>;

// The v-taper grouping shown on the Stats page.
export const MeasurementTrends: Story = {
  args: {
    title: 'Measurement Trends',
    metrics: ['vtaper', 'shoulder', 'waist'],
    entries: { vtaper: V_TAPER, shoulder: SHOULDER, waist: WAIST },
  },
};

// The bicep + quad grouping, charted as a separate card on the Stats page.
export const LimbTrends: Story = {
  args: {
    title: 'Limb Trends',
    metrics: ['bicep', 'thigh'],
    entries: { bicep: BICEP, thigh: THIGH },
  },
};

export const Empty: Story = {
  args: {
    title: 'Measurement Trends',
    metrics: ['vtaper', 'shoulder', 'waist'],
    entries: {},
  },
};
