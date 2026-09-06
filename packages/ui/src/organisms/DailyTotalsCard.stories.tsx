import type { Meta, StoryObj } from '@storybook/react';
import { DailyTotalsCard } from './DailyTotalsCard';

const baseTargets = { fat: 65, protein: 160, carbs: 200 };

const meta: Meta<typeof DailyTotalsCard> = {
  title: 'Design System/Organisms/DailyTotalsCard',
  component: DailyTotalsCard,
  args: {
    calories: 1520,
    calorieTarget: 2000,
    adjustedCalories: 1520,
    fat: 48,
    protein: 130,
    carbs: 95,
    fiber: 12,
    macroTargets: baseTargets,
    onUpdateTargets: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof DailyTotalsCard>;

export const Default: Story = {};

export const NoTarget: Story = {
  args: {
    calorieTarget: 0,
    onUpdateTargets: undefined,
  },
};

export const AtTarget: Story = {
  args: {
    calories: 2000,
    calorieTarget: 2000,
  },
};

export const OverTarget: Story = {
  args: {
    calories: 2450,
    adjustedCalories: 2450,
    calorieTarget: 2000,
  },
};

export const FiberAdjusted: Story = {
  args: {
    calories: 2006,
    adjustedCalories: 1780,
    calorieTarget: 2004,
    carbs: 187.5,
    fiber: 109.5,
  },
};
