import type { Meta, StoryObj } from '@storybook/react';
import { Text } from '../atoms/Text';
import { AppShell } from './AppShell';

const meta: Meta<typeof AppShell> = {
  title: 'Design System/Templates/AppShell',
  component: AppShell,
};

export default meta;
type Story = StoryObj<typeof AppShell>;

export const Default: Story = {
  args: {
    children: (
      <div className="flex flex-col gap-4">
        <Text as="h1" className="text-xl font-semibold">
          Page content
        </Text>
        <Text as="p">
          The AppShell wraps page content with standard shell and main layout styles.
        </Text>
      </div>
    ),
  },
};

export const WithClassName: Story = {
  args: {
    className: 'bg-[var(--ll-surface)]',
    children: (
      <div className="flex flex-col gap-4">
        <Text as="h1" className="text-xl font-semibold">
          Custom background
        </Text>
        <Text as="p">AppShell with an additional className applied.</Text>
      </div>
    ),
  },
};
