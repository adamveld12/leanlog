import type { Meta, StoryObj } from '@storybook/react';
import { ExtrasCard, type ExtraItem } from './ExtrasCard';
import { SectionCard } from '../molecules/SectionCard';

const sample: ExtraItem[] = [
  { id: '1', name: 'Tortilla chips', calories: 150, protein: 0, carbs: 0, fat: 0 },
  { id: '2', name: 'Greek yogurt', calories: 120, protein: 15, carbs: 9, fat: 0 },
];

// Stands in for the app-supplied search organism, which packages/ui cannot
// render from an organism (tier rules).
function Placeholder() {
  return <SectionCard title="Nutrition Facts Database">Search results go here.</SectionCard>;
}

const meta: Meta<typeof ExtrasCard> = {
  title: 'Design System/Organisms/ExtrasCard',
  component: ExtrasCard,
  args: {
    items: sample,
    onAdd: () => {},
    onEdit: () => {},
    onDelete: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof ExtrasCard>;

export const Default: Story = {};

export const Empty: Story = {
  args: { items: [] },
};

export const ReadOnlyWithItems: Story = {
  args: { readOnly: true },
};

// R5: unobtrusive when empty — a read-only past day with no extras renders nothing.
export const ReadOnlyEmpty: Story = {
  args: { items: [], readOnly: true },
};

// #93: the app supplies the nutrition database search; the card only hosts it
// behind a tab in the add flow.
export const WithDatabaseSearch: Story = {
  args: {
    databaseSearch: <Placeholder />,
  },
};
