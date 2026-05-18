import type { Meta, StoryObj } from '@storybook/react';
import { MacroSummaryLine } from './MacroSummaryLine';
import { PageNavHeading } from './PageNavHeading';

const meta: Meta<typeof PageNavHeading> = {
  title: 'Components/PageNavHeading',
  component: PageNavHeading,
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
    title: 'Dinner',
    subtitle: <MacroSummaryLine calories={520} protein={31} carbs={42} fat={20} />,
    backHref: '/day/1',
    profileHref: '/profile',
  },
};
