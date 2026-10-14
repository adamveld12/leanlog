import type { Meta, StoryObj } from '@storybook/react';
import { WeekDayTotalsCard } from './WeekDayTotalsCard';

const meta: Meta<typeof WeekDayTotalsCard> = {
  title: 'Design System/Organisms/WeekDayTotalsCard',
  component: WeekDayTotalsCard,
  args: {
    average: { calories: 1551, protein: 103, carbs: 154, fat: 51 },
    rows: [
      {
        key: '1',
        label: 'Oct 1',
        logged: false,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        weightLbs: null,
      },
      {
        key: '2',
        label: 'Oct 2',
        logged: true,
        calories: 1880,
        protein: 130,
        carbs: 190,
        fat: 60,
        weightLbs: 183.2,
        details: 'Breakfast · EGGS, OATS',
      },
      {
        key: '3',
        label: 'Yesterday',
        logged: true,
        calories: 1950,
        protein: 120,
        carbs: 210,
        fat: 70,
        weightLbs: 183,
        details: 'Lunch · CHICKEN BREAST',
      },
      {
        key: '4',
        label: 'Today',
        logged: true,
        calories: 1240,
        protein: 92,
        carbs: 110,
        fat: 41,
        weightLbs: null,
        details: 'Breakfast · EGGS',
      },
    ],
  },
};

export default meta;
type Story = StoryObj<typeof WeekDayTotalsCard>;

export const Default: Story = {};

export const NothingLogged: Story = {
  args: {
    average: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    rows: [
      {
        key: '1',
        label: 'Today',
        logged: false,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        weightLbs: null,
      },
    ],
  },
};
