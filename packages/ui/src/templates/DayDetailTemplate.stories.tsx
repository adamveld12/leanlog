import type { Meta, StoryObj } from '@storybook/react';
import { DayDetailTemplate } from './DayDetailTemplate';

const meta: Meta<typeof DayDetailTemplate> = {
  title: 'Design System/Templates/DayDetailTemplate',
  component: DayDetailTemplate,
  args: {
    heading: { title: 'May 22', profileHref: '/profile' },
    totals: { calories: 1800, protein: 160, carbs: 120, fat: 70, calorieTarget: 2200 },
    meals: [{ id: 'm1', title: 'LUNCH', meta: '640 kcal', rightMetric: '4 items' }],
    onAddMeal: () => undefined,
  },
};
export default meta;
type Story = StoryObj<typeof DayDetailTemplate>;
export const Default: Story = {};
