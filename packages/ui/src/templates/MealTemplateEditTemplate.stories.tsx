import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../atoms/Button';
import { HelperText } from '../atoms/HelperText';
import { Input } from '../atoms/Input';
import { ListRow } from '../molecules/ListRow';
import { MacroSummaryLine } from '../molecules/MacroSummaryLine';
import { SectionCard } from '../molecules/SectionCard';
import { MealTemplateEditTemplate } from './MealTemplateEditTemplate';

const heading = {
  title: 'Breakfast',
  backHref: '/track/templates',
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

const nameSection = (
  <SectionCard title="Template name">
    <Input value="Breakfast" placeholder="Template name" onChange={() => undefined} />
  </SectionCard>
);

const ingredientsSection = (
  <SectionCard title="Default ingredients">
    <HelperText as="p">Optional. These are copied into each new day&rsquo;s meal.</HelperText>
    <ListRow
      title="EGGS"
      meta={<MacroSummaryLine calories={140} protein={12} carbs={1} fat={10} />}
    />
  </SectionCard>
);

const dangerZone = (
  <SectionCard title="Danger zone">
    <Button variant="danger" className="w-full">
      Delete template
    </Button>
  </SectionCard>
);

const meta: Meta<typeof MealTemplateEditTemplate> = {
  title: 'Design System/Templates/MealTemplateEditTemplate',
  component: MealTemplateEditTemplate,
  args: { heading, nameSection, ingredientsSection, dangerZone },
};
export default meta;
type Story = StoryObj<typeof MealTemplateEditTemplate>;

export const Default: Story = {};
