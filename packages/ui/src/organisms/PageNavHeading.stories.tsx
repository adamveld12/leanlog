import type { Meta, StoryObj } from '@storybook/react';
import { MacroSummaryLine } from '../molecules/MacroSummaryLine';
import { PageNavHeading } from './PageNavHeading';

const meta: Meta<typeof PageNavHeading> = {
  title: 'Design System/Organisms/PageNavHeading',
  component: PageNavHeading,
  args: {
    renderNavLink: ({ href, label, className }) => (
      <a className={className} href={href}>
        {label}
      </a>
    ),
  },
};

export default meta;
type Story = StoryObj<typeof PageNavHeading>;

export const TitleOnly: Story = {
  args: {
    title: 'leanlog',
    profileHref: '/profile',
  },
};

export const WithBackAndSubtitle: Story = {
  args: {
    title: 'leanlog',
    subtitle: <MacroSummaryLine calories={520} protein={31} carbs={42} fat={20} />,
    backHref: '/day/1',
    profileHref: '/profile',
  },
};
