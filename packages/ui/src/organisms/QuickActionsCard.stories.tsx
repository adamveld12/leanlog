import type { Meta, StoryObj } from '@storybook/react';
import { QuickActionsCard } from './QuickActionsCard';
import { SectionCard } from '../molecules/SectionCard';

const meta: Meta<typeof QuickActionsCard> = {
  title: 'Design System/Organisms/QuickActionsCard',
  component: QuickActionsCard,
};

export default meta;
type Story = StoryObj<typeof QuickActionsCard>;

export const ActiveUser: Story = {
  args: {
    hasDays: true,
    week: {
      calories: 8200,
      calorieTarget: 18900,
      adjustedCalories: 8200,
      protein: 780,
      proteinTarget: 1890,
      carbs: 620,
      carbsTarget: 1652,
      fat: 290,
      fatTarget: 490,
      fiber: 84,
    },
    weekDayCount: 3,
    activeGoal: { summary: 'GOAL: 🎯 Cut · ends Jul 31', onOpen: () => {} },
    onOpenPlans: () => {},
    onAddExtra: () => {},
  },
};

export const WeekOnly: Story = {
  args: {
    hasDays: true,
    week: {
      calories: 5400,
      calorieTarget: 13500,
      adjustedCalories: 5400,
      protein: 520,
      proteinTarget: 1350,
      carbs: 410,
      carbsTarget: 1180,
      fat: 195,
      fatTarget: 375,
      fiber: 56,
    },
    weekDayCount: 2,
  },
};

export const ZeroDays: Story = {
  args: {
    hasDays: false,
  },
};

// #93: the app supplies the nutrition database search for the inline extra flow.
export const WithExtraDatabaseSearch: Story = {
  args: {
    hasDays: true,
    onAddExtra: () => {},
    extraDatabaseSearch: <SectionCard title="Nutrition Facts Database">Results here.</SectionCard>,
  },
};
