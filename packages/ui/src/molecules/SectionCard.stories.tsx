import type { Meta, StoryObj } from '@storybook/react';
import { SectionCard } from './SectionCard';

const meta: Meta<typeof SectionCard> = {
  title: 'Design System/Molecules/SectionCard',
  component: SectionCard,
  args: { title: 'Targets', children: 'Section content' },
};

export default meta;
type Story = StoryObj<typeof SectionCard>;

export const Default: Story = {};
export const Saved: Story = { args: { saved: true } };
