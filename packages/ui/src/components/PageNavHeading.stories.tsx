import type { Meta, StoryObj } from '@storybook/react';
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
    subtitle: '520 kcal · P 31g · C 42g · F 20g',
    backHref: '/day/1',
    profileHref: '/profile',
  },
};
