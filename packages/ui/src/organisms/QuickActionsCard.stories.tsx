import type { Meta, StoryObj } from '@storybook/react';
import { QuickActionsCard } from './QuickActionsCard';

const meta: Meta<typeof QuickActionsCard> = {
  title: 'Design System/Organisms/QuickActionsCard',
  component: QuickActionsCard,
};

export default meta;
type Story = StoryObj<typeof QuickActionsCard>;

export const ActiveUser: Story = {
  args: {
    hasToday: true,
    hasDays: true,
    today: {
      calories: 1520,
      calorieTarget: 2700,
      protein: 130,
      proteinTarget: 270,
      carbs: 95,
      carbsTarget: 236,
      fat: 48,
      fatTarget: 75,
      fiber: 12,
    },
    week: {
      calories: 8200,
      calorieTarget: 18900,
      protein: 780,
      proteinTarget: 1890,
      carbs: 620,
      carbsTarget: 1652,
      fat: 290,
      fatTarget: 490,
      fiber: 84,
    },
    weekDayCount: 3,
    onAction: () => {},
  },
};

export const NoTodayEntry: Story = {
  args: {
    hasToday: false,
    hasDays: true,
    week: {
      calories: 5400,
      calorieTarget: 13500,
      protein: 520,
      proteinTarget: 1350,
      carbs: 410,
      carbsTarget: 1180,
      fat: 195,
      fatTarget: 375,
      fiber: 56,
    },
    weekDayCount: 2,
    onAction: () => {},
  },
};

export const ZeroDays: Story = {
  args: {
    hasToday: false,
    hasDays: false,
    onAction: () => {},
  },
};
