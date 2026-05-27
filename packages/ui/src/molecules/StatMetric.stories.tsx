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

export const WeightLost: Story = {
  args: {
    label: 'Est. Weight Lost',
    value: '0.8 lb',
    progress: 60,
    detail: '~60% certainty',
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
