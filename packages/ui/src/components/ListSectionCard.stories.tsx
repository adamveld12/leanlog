import type { Meta, StoryObj } from '@storybook/react';
import { ListSectionCard } from './ListSectionCard';

const baseItems = [
  {
    id: '1',
    title: 'BREAKFAST',
    meta: (
      <>
        520<span className="ll-unit"> kcal</span> · P 30<span className="ll-unit">g</span> · C 20
        <span className="ll-unit">g</span> · F 34<span className="ll-unit">g</span>
      </>
    ),
    rightMetric: <span className="ll-meta">3 items</span>,
    onOpen: () => undefined,
    onDelete: () => undefined,
  },
  {
    id: '2',
    title: 'LUNCH',
    meta: (
      <>
        640<span className="ll-unit"> kcal</span> · P 42<span className="ll-unit">g</span> · C 18
        <span className="ll-unit">g</span> · F 44<span className="ll-unit">g</span>
      </>
    ),
    rightMetric: <span className="ll-meta">4 items</span>,
    onOpen: () => undefined,
    onDelete: () => undefined,
    deleteLabel: 'Delete meal',
  },
];

const meta: Meta<typeof ListSectionCard> = {
  title: 'Components/ListSectionCard',
  component: ListSectionCard,
  args: {
    title: 'Meals 2 / 3',
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
