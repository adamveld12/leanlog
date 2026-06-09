import type { Meta, StoryObj } from '@storybook/react';
import { Tabs } from './Tabs';

const tabs = [
  { key: 'overview', label: 'Overview', panelId: 'story-overview-panel' },
  { key: 'meals', label: 'Meals', panelId: 'story-meals-panel' },
  { key: 'macros', label: 'Macros', panelId: 'story-macros-panel' },
];

const meta: Meta<typeof Tabs> = {
  title: 'Design System/Molecules/Tabs',
  component: Tabs,
  args: {
    tabs,
    active: 'overview',
    onChange: () => {},
    label: 'Day summary section',
  },
};

export default meta;
type Story = StoryObj<typeof Tabs>;

export const Default: Story = {};

export const SecondActive: Story = {
  args: { active: 'meals' },
};

export const ThirdActive: Story = {
  args: { active: 'macros' },
};
