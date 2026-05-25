import type { Meta, StoryObj } from '@storybook/react';
import { Tabs } from './Tabs';

const tabs = [
  { key: 'overview', label: 'Overview' },
  { key: 'meals', label: 'Meals' },
  { key: 'macros', label: 'Macros' },
];

const meta: Meta<typeof Tabs> = {
  title: 'Design System/Molecules/Tabs',
  component: Tabs,
  args: {
    tabs,
    active: 'overview',
    onChange: () => {},
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
