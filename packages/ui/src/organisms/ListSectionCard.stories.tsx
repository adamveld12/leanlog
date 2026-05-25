import type { Meta, StoryObj } from '@storybook/react';
import { ListSectionCard } from './ListSectionCard';

const baseItems = [
  {
    id: '1',
    title: 'Meals',
    meta: (
      <>
        520<span className="text-[var(--ll-text-muted)]"> kcal</span> · P 30
        <span className="text-[var(--ll-text-muted)]">g</span> · C 20
        <span className="text-[var(--ll-text-muted)]">g</span> · F 34
        <span className="text-[var(--ll-text-muted)]">g</span>
      </>
    ),
    rightMetric: <span className="text-xs font-medium text-[var(--ll-text-muted)]">3 items</span>,
    onOpen: () => undefined,
    onDelete: () => undefined,
  },
  {
    id: '2',
    title: 'Meals',
    meta: (
      <>
        640<span className="text-[var(--ll-text-muted)]"> kcal</span> · P 42
        <span className="text-[var(--ll-text-muted)]">g</span> · C 18
        <span className="text-[var(--ll-text-muted)]">g</span> · F 44
        <span className="text-[var(--ll-text-muted)]">g</span>
      </>
    ),
    rightMetric: <span className="text-xs font-medium text-[var(--ll-text-muted)]">4 items</span>,
    onOpen: () => undefined,
    onDelete: () => undefined,
    deleteLabel: 'Delete meal',
  },
];

const meta: Meta<typeof ListSectionCard> = {
  title: 'Design System/Organisms/ListSectionCard',
  component: ListSectionCard,
  args: {
    title: 'Meals',
    items: baseItems,
  },
};

export default meta;
type Story = StoryObj<typeof ListSectionCard>;

export const Default: Story = {};
export const EmptyDefault: Story = { args: { items: [] } };
export const EmptyCustom: Story = {
  args: { items: [], emptyText: 'No meals yet. Add one above.' },
};
