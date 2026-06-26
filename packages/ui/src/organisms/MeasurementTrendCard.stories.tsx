import type { Meta, StoryObj } from '@storybook/react';
import { MeasurementTrendCard } from './MeasurementTrendCard';

const V_TAPER = [
  { date: '2026-05-01', value: 1.5 },
  { date: '2026-05-08', value: 1.52 },
  { date: '2026-05-15', value: 1.55 },
  { date: '2026-05-22', value: 1.58 },
  { date: '2026-05-29', value: 1.61 },
];

const WAIST = [
  { date: '2026-05-01', value: 34 },
  { date: '2026-05-08', value: 33.5 },
  { date: '2026-05-15', value: 33 },
  { date: '2026-05-22', value: 32.5 },
  { date: '2026-05-29', value: 32 },
];

const NOW = new Date('2026-05-30T12:00:00');

const meta: Meta<typeof MeasurementTrendCard> = {
  title: 'Design System/Organisms/MeasurementTrendCard',
  component: MeasurementTrendCard,
  args: { now: NOW, defaultRange: 'all' },
};

export default meta;
type Story = StoryObj<typeof MeasurementTrendCard>;

export const VTaper: Story = {
  args: { vTaperEntries: V_TAPER, waistEntries: WAIST, defaultMetric: 'vtaper' },
};

export const Waist: Story = {
  args: { vTaperEntries: V_TAPER, waistEntries: WAIST, defaultMetric: 'waist' },
};

export const Empty: Story = {
  args: { vTaperEntries: [], waistEntries: [] },
};
