import type { Meta, StoryObj } from '@storybook/react';
import { DayListTemplate } from './DayListTemplate';
import { QuickActionsCard } from '../organisms/QuickActionsCard';
import { WeeklyStatsCard } from '../organisms/WeeklyStatsCard';
import { MonthCalendarCard } from '../organisms/MonthCalendarCard';

const emptyStats = {
  accuracyOverall: 0,
  accuracyCalories: 0,
  accuracyProtein: 0,
  accuracyCarbs: 0,
  accuracyFat: 0,
  coverage: 0,
  mealsTracked: 0,
  mealsExpected: 0,
};

const meta: Meta<typeof DayListTemplate> = {
  title: 'Design System/Templates/DayListTemplate',
  component: DayListTemplate,
  args: {
    heading: {
      title: 'leanlog',
      navLinks: [
        { href: '/track', label: 'Execute' },
        { href: '/track/goals', label: 'Goals' },
      ],
      renderNavLink: ({ href, label, className }) => (
        <a className={className} href={href}>
          {label}
        </a>
      ),
    },
    quickActions: <QuickActionsCard hasToday={false} hasDays={false} onAction={() => {}} />,
    statistics: (
      <WeeklyStatsCard
        weekly={emptyStats}
        overall={emptyStats}
        hasWeeklyData={false}
        hasOverallData={false}
        northStar={null}
        weeklyWeightChangeLbs={null}
      />
    ),
    calendar: (
      <MonthCalendarCard
        trackedDates={new Map()}
        onSelectDay={() => {}}
        onCreateDay={() => {}}
        emptyHint="Start logging to fill in your calendar!"
      />
    ),
  },
};
export default meta;
type Story = StoryObj<typeof DayListTemplate>;
export const Default: Story = {};
