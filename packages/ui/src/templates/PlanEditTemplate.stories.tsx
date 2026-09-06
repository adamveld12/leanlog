import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../atoms/Button';
import { HelperText } from '../atoms/HelperText';
import { Input } from '../atoms/Input';
import { ReorderableList } from '../molecules/ReorderableList';
import { SectionCard } from '../molecules/SectionCard';
import { DailyTotalsCard } from '../organisms/DailyTotalsCard';
import { PlanEditTemplate } from './PlanEditTemplate';

const heading = {
  title: 'High protein day',
  backHref: '/track/goals/plans',
  navLinks: [
    { href: '/track', label: 'Execute' },
    { href: '/track/goals', label: 'Goals' },
  ],
  renderNavLink: ({
    href,
    label,
    className,
  }: {
    href: string;
    label: string;
    className: string;
  }) => (
    <a className={className} href={href}>
      {label}
    </a>
  ),
};

const nameSection = (
  <SectionCard title="Plan name">
    <Input value="High protein day" placeholder="Plan name" onChange={() => undefined} />
    <div className="flex gap-2">
      <Button variant="secondary" className="flex-1">
        Duplicate
      </Button>
      <Button className="flex-1">Apply to…</Button>
    </div>
  </SectionCard>
);

const totalsSection = (
  <DailyTotalsCard
    calories={2088}
    calorieTarget={2100}
    adjustedCalories={2088}
    fat={62}
    protein={195}
    carbs={180}
    fiber={31}
    macroTargets={{ fat: 58, protein: 210, carbs: 184 }}
  />
);

const mealsSection = (
  <SectionCard title="Meals">
    <ReorderableList
      items={[
        { id: 'a', title: 'Breakfast', meta: <HelperText>612 kcal · 48p · 55c · 21f</HelperText> },
        { id: 'b', title: 'Lunch', meta: <HelperText>704 kcal · 66p · 61c · 22f</HelperText> },
        { id: 'c', title: 'Dinner', meta: <HelperText>772 kcal · 81p · 64c · 19f</HelperText> },
      ]}
      onReorder={() => undefined}
    />
    <Button className="w-full" variant="secondary">
      Add meal
    </Button>
  </SectionCard>
);

const dangerZone = (
  <SectionCard title="Danger zone">
    <Button variant="danger" className="w-full">
      Delete plan
    </Button>
  </SectionCard>
);

const meta: Meta<typeof PlanEditTemplate> = {
  title: 'Design System/Templates/PlanEditTemplate',
  component: PlanEditTemplate,
  args: { heading, nameSection, totalsSection, mealsSection, dangerZone },
};
export default meta;
type Story = StoryObj<typeof PlanEditTemplate>;

export const Default: Story = {};
