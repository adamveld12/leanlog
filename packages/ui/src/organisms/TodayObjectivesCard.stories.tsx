import type { Meta, StoryObj } from '@storybook/react';
import { TodayObjectivesCard, type TodayObjectivesCardProps } from './TodayObjectivesCard';

const meta: Meta<typeof TodayObjectivesCard> = {
  title: 'Design System/Organisms/TodayObjectivesCard',
  component: TodayObjectivesCard,
};

export default meta;
type Story = StoryObj<typeof TodayObjectivesCard>;

const row = (actual: number, target: number, complete = false) => ({ actual, target, complete });
const noop = () => {};

const base: TodayObjectivesCardProps = {
  weight: { complete: false, weightLbs: null, onLogWeight: noop },
  meals: { complete: false, eaten: 0, target: 4, onNextMeal: noop },
  macros: {
    complete: false,
    protein: row(0, 200),
    carbs: row(0, 250),
    fat: row(0, 70),
    calories: row(0, 2400),
  },
  allComplete: false,
};

// First thing in the morning: weight is the primary action.
export const AllIncomplete: Story = { args: base };

export const WeightLogged: Story = {
  args: {
    ...base,
    weight: { complete: true, weightLbs: 182.5, onLogWeight: noop },
  },
};

// Mid-day: two meals in, macros still short; one macro is already over range.
export const MealsPartial: Story = {
  args: {
    ...base,
    weight: { complete: true, weightLbs: 182.5, onLogWeight: noop },
    meals: { complete: false, eaten: 2, target: 4, onNextMeal: noop },
    macros: {
      complete: false,
      protein: row(118, 200),
      carbs: row(96, 250),
      fat: row(82, 70),
      calories: row(1420, 2400),
    },
  },
};

export const AllComplete: Story = {
  args: {
    weight: { complete: true, weightLbs: 182.5, onLogWeight: noop },
    meals: { complete: true, eaten: 4, target: 4, onNextMeal: noop },
    macros: {
      complete: true,
      protein: row(204, 200, true),
      carbs: row(241, 250, true),
      fat: row(68, 70, true),
      // Calories can sit outside range and the day still completes.
      calories: row(2100, 2400),
    },
    allComplete: true,
    completedAtLabel: '8:42pm',
  },
};
