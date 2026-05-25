import type { Meta, StoryObj } from '@storybook/react';
import { DailyTotalsCard } from '../organisms/DailyTotalsCard';
import { DayDetailTemplate } from './DayDetailTemplate';

const meta: Meta<typeof DayDetailTemplate> = {
  title: 'Design System/Templates/DayDetailTemplate',
  component: DayDetailTemplate,
  args: {
    heading: { title: 'May 22', profileHref: '/profile' },
    totalsSection: (
      <DailyTotalsCard
        calories={1800}
        calorieTarget={2200}
        fat={70}
        protein={160}
        carbs={120}
        fiber={15}
        macroTargets={{ fat: 80, protein: 180, carbs: 150 }}
      />
    ),
    mealsTitle: 'Meals 1 / 4',
    mealsItems: [{ id: 'm1', title: 'LUNCH', meta: '640 kcal', rightMetric: '4 items' }],
    mealsControls: undefined,
  },
};
export default meta;
type Story = StoryObj<typeof DayDetailTemplate>;
export const Default: Story = {};
