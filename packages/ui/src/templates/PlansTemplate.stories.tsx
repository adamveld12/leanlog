import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../atoms/Button';
import { HelperText } from '../atoms/HelperText';
import { Input } from '../atoms/Input';
import { ReorderableList } from '../molecules/ReorderableList';
import { SectionCard } from '../molecules/SectionCard';
import { PlansTemplate } from './PlansTemplate';

const heading = {
  title: 'Plans',
  backHref: '/track/goals',
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

const listSection = (
  <SectionCard title="Your plans">
    <HelperText as="p">
      Apply a plan to a day, or point a goal at one as its default day shape.
    </HelperText>
    <ReorderableList
      items={[
        { id: 'a', title: 'High protein day', meta: <HelperText>3 meals</HelperText> },
        { id: 'b', title: 'Rest day', meta: <HelperText>4 meals</HelperText> },
        { id: 'c', title: 'Saved meals', meta: <HelperText>2 meals</HelperText> },
      ]}
      onReorder={() => undefined}
    />
  </SectionCard>
);

const addSection = (
  <SectionCard title="Add plan">
    <Input value="" placeholder="e.g. High protein day" onChange={() => undefined} />
    <Button className="w-full" disabled>
      Add plan
    </Button>
  </SectionCard>
);

const meta: Meta<typeof PlansTemplate> = {
  title: 'Design System/Templates/PlansTemplate',
  component: PlansTemplate,
  args: { heading, listSection, addSection },
};
export default meta;
type Story = StoryObj<typeof PlansTemplate>;

export const Default: Story = {};

export const Empty: Story = {
  args: {
    listSection: (
      <SectionCard title="Your plans">
        <HelperText as="p">No plans yet. Build one to simulate a day of eating.</HelperText>
      </SectionCard>
    ),
  },
};
