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
  accuracyProtein: 92,
  accuracyCarbs: 85,
  accuracyFat: 83,
  coverage: 75,
  mealsTracked: 21,
  mealsExpected: 28,
  estimatedWeightLost: 0.8,
  certainty: 60,
};

const highCertaintyStats: StatsData = {
  accuracyOverall: 94,
  accuracyProtein: 96,
  accuracyCarbs: 93,
  accuracyFat: 91,
  coverage: 100,
  mealsTracked: 28,
  mealsExpected: 28,
  estimatedWeightLost: 1.2,
  certainty: 80,
};

export const WeeklyTab: Story = {
  args: {
    weekly: goodStats,
    overall: highCertaintyStats,
    hasDays: true,
  },
};

export const OverallTab: Story = {
  args: {
    weekly: goodStats,
    overall: highCertaintyStats,
    hasDays: true,
  },
};

export const LowCertaintyWarning: Story = {
  args: {
    weekly: { ...goodStats, certainty: 40, coverage: 50 },
    overall: goodStats,
    hasDays: true,
  },
};

export const ZeroDays: Story = {
  args: {
    weekly: {
      accuracyOverall: 0,
      accuracyProtein: 0,
      accuracyCarbs: 0,
      accuracyFat: 0,
      coverage: 0,
      mealsTracked: 0,
      mealsExpected: 0,
      estimatedWeightLost: 0,
      certainty: 0,
    },
    overall: {
      accuracyOverall: 0,
      accuracyProtein: 0,
      accuracyCarbs: 0,
      accuracyFat: 0,
      coverage: 0,
      mealsTracked: 0,
      mealsExpected: 0,
      estimatedWeightLost: 0,
      certainty: 0,
    },
    hasDays: false,
  },
};
