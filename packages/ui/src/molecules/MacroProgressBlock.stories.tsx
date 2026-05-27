import type { Meta, StoryObj } from '@storybook/react';
import { MacroProgressBlock } from './MacroProgressBlock';

const meta: Meta<typeof MacroProgressBlock> = {
  title: 'Design System/Molecules/MacroProgressBlock',
  component: MacroProgressBlock,
};

export default meta;
type Story = StoryObj<typeof MacroProgressBlock>;

export const Today: Story = {
  args: {
    label: 'Today',
    calories: 1520,
    calorieTarget: 2700,
    protein: 130,
    proteinTarget: 270,
    carbs: 95,
    carbsTarget: 236,
    fat: 48,
    fatTarget: 75,
  },
};

export const ThisWeek: Story = {
  args: {
    label: 'This Week (Mon-Sun)',
    calories: 8200,
    calorieTarget: 18900,
    protein: 780,
    proteinTarget: 1890,
    carbs: 620,
    carbsTarget: 1652,
    fat: 290,
    fatTarget: 490,
    detail: '3 days tracked',
  },
};

export const OnTarget: Story = {
  args: {
    label: 'Today',
    calories: 2650,
    calorieTarget: 2700,
    protein: 265,
    proteinTarget: 270,
    carbs: 230,
    carbsTarget: 236,
    fat: 73,
    fatTarget: 75,
  },
};

export const OverTarget: Story = {
  args: {
    label: 'Today',
    calories: 3200,
    calorieTarget: 2700,
    protein: 310,
    proteinTarget: 270,
    carbs: 300,
    carbsTarget: 236,
    fat: 95,
    fatTarget: 75,
  },
};
