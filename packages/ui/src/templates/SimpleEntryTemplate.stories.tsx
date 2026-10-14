import type { Meta, StoryObj } from '@storybook/react';
import { BodyTrackingCard } from '../organisms/BodyTrackingCard';
import { DailyTotalsCard } from '../organisms/DailyTotalsCard';
import { MealSectionCard } from '../organisms/MealSectionCard';
import { SIMPLE_NAV_LINKS } from '../organisms/appNav';
import { SimpleEntryTemplate } from './SimpleEntryTemplate';

const empty = { calories: 0, protein: 0, carbs: 0, fat: 0 };

const meta: Meta<typeof SimpleEntryTemplate> = {
  title: 'Design System/Templates/SimpleEntryTemplate',
  component: SimpleEntryTemplate,
  args: {
    heading: {
      navLinks: SIMPLE_NAV_LINKS,
      renderNavLink: ({ href, label, className }) => (
        <a className={className} href={href}>
          {label}
        </a>
      ),
    },
    weightSection: (
      <BodyTrackingCard variant="weightOnly" weightLbs={182.4} onSaveWeight={() => {}} />
    ),
    totalsSection: (
      <DailyTotalsCard
        calories={420}
        adjustedCalories={420}
        protein={22}
        carbs={51}
        fat={15}
        fiber={0}
      />
    ),
    sections: (
      <>
        <MealSectionCard
          title="Breakfast"
          items={[
            {
              id: '1',
              name: 'EGGS',
              calories: 140,
              protein: 12,
              carbs: 1,
              fat: 10,
              editable: true,
            },
          ]}
          totals={{ calories: 140, protein: 12, carbs: 1, fat: 10 }}
          onAdd={() => {}}
        />
        <MealSectionCard title="Lunch" items={[]} totals={empty} onAdd={() => {}} />
        <MealSectionCard title="Dinner" items={[]} totals={empty} onAdd={() => {}} />
        <MealSectionCard title="Snacks" items={[]} totals={empty} onAdd={() => {}} />
      </>
    ),
  },
};

export default meta;
type Story = StoryObj<typeof SimpleEntryTemplate>;

export const Default: Story = {};
