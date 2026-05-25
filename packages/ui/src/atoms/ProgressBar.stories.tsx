import type { Meta, StoryObj } from '@storybook/react';
import { ProgressBar } from './ProgressBar';

const meta: Meta<typeof ProgressBar> = {
  title: 'Design System/Atoms/ProgressBar',
  component: ProgressBar,
  args: { max: 100 },
};

export default meta;
type Story = StoryObj<typeof ProgressBar>;

export const Empty: Story = {
  args: { value: 0 },
};

export const Half: Story = {
  args: { value: 50 },
};

export const Full: Story = {
  args: { value: 100 },
};

export const CustomColor: Story = {
  args: { value: 65, color: 'var(--ll-warn)' },
};
