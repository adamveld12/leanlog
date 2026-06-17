import type { Meta, StoryObj } from '@storybook/react';
import { HelperText } from '../atoms/HelperText';
import { SectionCard } from '../molecules/SectionCard';
import { NutritionFactsDatabaseTemplate } from './NutritionFactsDatabaseTemplate';

const heading = {
  title: 'Nutrition Facts Database',
  backHref: '/track',
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

const meta: Meta<typeof NutritionFactsDatabaseTemplate> = {
  title: 'Design System/Templates/NutritionFactsDatabaseTemplate',
  component: NutritionFactsDatabaseTemplate,
  args: {
    heading,
    children: (
      <SectionCard title="Nutrition Facts Database">
        <HelperText as="p">Browse, scan, and manage your saved nutrition labels.</HelperText>
      </SectionCard>
    ),
  },
};
export default meta;
type Story = StoryObj<typeof NutritionFactsDatabaseTemplate>;

export const Default: Story = {};
