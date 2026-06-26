import type { Meta, StoryObj } from '@storybook/react';
import { StatMetric } from './StatMetric';

const meta: Meta<typeof StatMetric> = {
  title: 'Design System/Molecules/StatMetric',
  component: StatMetric,
};

export default meta;
type Story = StoryObj<typeof StatMetric>;

export const MacroAccuracy: Story = {
  args: {
    label: 'Macro Accuracy',
    value: '87%',
    progress: 87,
    detail: 'P 92% C 85% F 83%',
  },
};

export const Coverage: Story = {
  args: {
    label: 'Coverage',
    value: '75%',
    progress: 75,
    detail: '21 / 28 meals tracked',
  },
};

// Measured week-over-week weight change (#68): a barless stat — a signed delta
// has no natural 0–100 scale, so `progress` is omitted.
export const WeeklyWeightChange: Story = {
  args: {
    label: 'Weekly Weight Change',
    value: '−2.0 lb',
    detail: 'avg last 7 days vs prior 7 days',
  },
};

export const NorthStarVTaper: Story = {
  args: {
    label: 'V-Taper (North Star)',
    value: '1.56',
    progress: 98,
    detail: 'Target 1.60 · 0.04 to go',
  },
};

export const WithHint: Story = {
  args: {
    label: 'Macro Accuracy',
    value: '--',
    progress: 0,
    hint: 'Track meals to see how accurately you hit your macro targets.',
  },
};

export const CustomColor: Story = {
  args: {
    label: 'Coverage',
    value: '50%',
    progress: 50,
    progressColor: 'var(--ll-warn)',
    detail: '10 / 20 meals tracked',
  },
};
