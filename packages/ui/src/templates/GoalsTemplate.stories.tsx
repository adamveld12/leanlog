import type { Meta, StoryObj } from '@storybook/react';
import { HelperText } from '../atoms/HelperText';
import { SectionCard } from '../molecules/SectionCard';
import { GoalsTemplate } from './GoalsTemplate';

const heading = {
  title: 'Goals',
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

const meta: Meta<typeof GoalsTemplate> = {
  title: 'Design System/Templates/GoalsTemplate',
  component: GoalsTemplate,
  args: {
    heading,
    children: (
      <SectionCard title="Timeline">
        <HelperText as="p">Plan cut, maintain, and lean-gain phases over time.</HelperText>
      </SectionCard>
    ),
  },
};
export default meta;
type Story = StoryObj<typeof GoalsTemplate>;

export const Default: Story = {};
