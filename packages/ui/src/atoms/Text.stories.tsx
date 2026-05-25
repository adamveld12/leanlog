import type { Meta, StoryObj } from '@storybook/react';
import { Text } from './Text';

function AllVariants() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <Text variant="title" as="h1">
        title — Today&apos;s Log
      </Text>
      <Text variant="sectionHeading" as="h2">
        sectionHeading — Macros
      </Text>
      <Text variant="pageSubtitle" as="p">
        pageSubtitle — Track your daily nutrition
      </Text>
      <Text variant="body" as="p">
        body — Eat whole foods, stay consistent, and hit your targets each day.
      </Text>
      <Text variant="meta" as="span">
        meta — Updated 2 minutes ago
      </Text>
      <Text variant="warn" as="span">
        warn — Calories exceed your daily goal.
      </Text>
    </div>
  );
}

const meta: Meta<typeof AllVariants> = {
  title: 'Design System/Atoms/Text',
  component: AllVariants,
};

export default meta;
type Story = StoryObj<typeof AllVariants>;

export const Variants: Story = {};
