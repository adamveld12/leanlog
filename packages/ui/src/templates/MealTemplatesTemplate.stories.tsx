import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../atoms/Button';
import { HelperText } from '../atoms/HelperText';
import { Input } from '../atoms/Input';
import { ReorderableList } from '../molecules/ReorderableList';
import { SectionCard } from '../molecules/SectionCard';
import { MealTemplatesTemplate } from './MealTemplatesTemplate';

const heading = {
  title: 'Meal templates',
  backHref: '/track',
  profileHref: '/profile',
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

const listSection = (
  <SectionCard title="Your templates">
    <HelperText as="p">
      New days copy these meals in order. Changes apply only to days created afterward.
    </HelperText>
    <ReorderableList
      items={[
        { id: 'a', title: 'Breakfast', meta: <HelperText>2 default ingredients</HelperText> },
        { id: 'b', title: 'Lunch', meta: <HelperText>No defaults</HelperText> },
        { id: 'c', title: 'Dinner', meta: <HelperText>1 default ingredient</HelperText> },
      ]}
      onReorder={() => undefined}
    />
  </SectionCard>
);

const addSection = (
  <SectionCard title="Add template">
    <Input value="" placeholder="e.g. Pre-workout" onChange={() => undefined} />
    <Button className="w-full" disabled>
      Add template
    </Button>
  </SectionCard>
);

const meta: Meta<typeof MealTemplatesTemplate> = {
  title: 'Design System/Templates/MealTemplatesTemplate',
  component: MealTemplatesTemplate,
  args: { heading, listSection, addSection },
};
export default meta;
type Story = StoryObj<typeof MealTemplatesTemplate>;

export const Default: Story = {};

export const Empty: Story = {
  args: {
    listSection: (
      <SectionCard title="Your templates">
        <HelperText as="p">
          No templates yet. New days will start empty so you can add meals manually.
        </HelperText>
      </SectionCard>
    ),
  },
};
