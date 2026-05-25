import type { Meta, StoryObj } from '@storybook/react';
import { DayListTemplate } from './DayListTemplate';

const meta: Meta<typeof DayListTemplate> = {
  title: 'Design System/Templates/DayListTemplate',
  component: DayListTemplate,
  args: {
    heading: { title: 'leanlog', profileHref: '/profile' },
    addDay: { onDayAdded: () => undefined },
    days: [{ id: 'd1', title: 'May 22, 2026', meta: '2 meals', rightMetric: '1,800 kcal' }],
  },
};
export default meta;
type Story = StoryObj<typeof DayListTemplate>;
export const Default: Story = {};
