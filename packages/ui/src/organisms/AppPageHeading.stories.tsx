import type { Meta, StoryObj } from '@storybook/react';
import { AppPageHeading } from './AppPageHeading';

const meta: Meta<typeof AppPageHeading> = {
  title: 'Design System/Organisms/AppPageHeading',
  component: AppPageHeading,
  args: {
    title: 'Day Detail',
  },
};

export default meta;
type Story = StoryObj<typeof AppPageHeading>;

export const Default: Story = {};

export const WithBack: Story = {
  args: {
    backHref: '/track',
  },
};

export const WithRightContent: Story = {
  args: {
    rightContent: <button type="button">Add meal</button>,
  },
};

export const WithBackAndRight: Story = {
  args: {
    backHref: '/track',
    rightContent: <button type="button">Add meal</button>,
  },
};
