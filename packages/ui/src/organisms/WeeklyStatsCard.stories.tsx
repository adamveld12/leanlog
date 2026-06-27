import type { Meta, StoryObj } from '@storybook/react';
import { WeeklyStatsCard, type StatsData } from './WeeklyStatsCard';

const meta: Meta<typeof WeeklyStatsCard> = {
  title: 'Design System/Organisms/WeeklyStatsCard',
  component: WeeklyStatsCard,
};

export default meta;
type Story = StoryObj<typeof WeeklyStatsCard>;

const goodStats: StatsData = {
  accuracyOverall: 87,
  accuracyCalories: 89,
  accuracyProtein: 92,
  accuracyCarbs: 85,
  accuracyFat: 83,
  coverage: 75,
  mealsTracked: 21,
  mealsExpected: 28,
};

const greatStats: StatsData = {
  accuracyOverall: 94,
  accuracyCalories: 95,
  accuracyProtein: 96,
  accuracyCarbs: 93,
  accuracyFat: 91,
  coverage: 100,
  mealsTracked: 28,
  mealsExpected: 28,
};

const emptyStats: StatsData = {
  accuracyOverall: 0,
  accuracyCalories: 0,
  accuracyProtein: 0,
  accuracyCarbs: 0,
  accuracyFat: 0,
  coverage: 0,
  mealsTracked: 0,
  mealsExpected: 0,
};

export const Default: Story = {
  args: {
    weekly: goodStats,
    overall: greatStats,
    hasWeeklyData: true,
    hasOverallData: true,
    northStar: { currentVTaper: 1.56, target: 1.6, gapToTarget: 0.04, met: false },
    weeklyWeightChangeLbs: -2,
  },
};

export const NorthStarReached: Story = {
  args: {
    weekly: greatStats,
    overall: greatStats,
    hasWeeklyData: true,
    hasOverallData: true,
    northStar: { currentVTaper: 1.65, target: 1.6, gapToTarget: 0, met: true },
    weeklyWeightChangeLbs: 0.3,
  },
};

export const NoMeasurementsYet: Story = {
  args: {
    weekly: goodStats,
    overall: goodStats,
    hasWeeklyData: true,
    hasOverallData: true,
    northStar: null,
    weeklyWeightChangeLbs: null,
  },
};

export const ZeroDays: Story = {
  args: {
    weekly: emptyStats,
    overall: emptyStats,
    hasWeeklyData: false,
    hasOverallData: false,
    northStar: null,
    weeklyWeightChangeLbs: null,
  },
};
