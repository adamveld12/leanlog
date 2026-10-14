import type { Meta, StoryObj } from '@storybook/react';
import { WeekDayTotalsCard } from '../organisms/WeekDayTotalsCard';
import { SIMPLE_NAV_LINKS } from '../organisms/appNav';
import { SimpleStatsTemplate } from './SimpleStatsTemplate';

const meta: Meta<typeof SimpleStatsTemplate> = {
  title: 'Design System/Templates/SimpleStatsTemplate',
  component: SimpleStatsTemplate,
  args: {
    heading: {
      navLinks: SIMPLE_NAV_LINKS,
      renderNavLink: ({ href, label, className }) => (
        <a className={className} href={href}>
          {label}
        </a>
      ),
    },
    weekSection: (
      <WeekDayTotalsCard
        average={{ calories: 1551, protein: 103, carbs: 154, fat: 51 }}
        rows={[
          {
            key: 't',
            label: 'Today',
            logged: true,
            calories: 1240,
            protein: 92,
            carbs: 110,
            fat: 41,
            weightLbs: 182.4,
            details: 'Breakfast · EGGS',
          },
        ]}
      />
    ),
  },
};

export default meta;
type Story = StoryObj<typeof SimpleStatsTemplate>;

export const Default: Story = {};
