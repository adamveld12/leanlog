import type { Meta, StoryObj } from '@storybook/react';
import { LoadingState } from './LoadingState';

const meta: Meta<typeof LoadingState> = {
  title: 'Design System/Molecules/LoadingState',
  component: LoadingState,
};

export default meta;
type Story = StoryObj<typeof LoadingState>;

export const Default: Story = {};

export const WithLabel: Story = {
  args: { label: 'Loading your days…' },
};

export const Small: Story = {
  args: { size: 'sm', label: 'Loading…' },
};
