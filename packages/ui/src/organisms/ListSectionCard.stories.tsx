import type { Meta, StoryObj } from '@storybook/react';
import { Text } from '../atoms/Text';
import { UnitText } from '../atoms/UnitText';
import { ListSectionCard } from './ListSectionCard';

const baseItems = [
  {
    id: '1',
    title: 'Meals',
    meta: (
      <>
        520<UnitText> kcal</UnitText> · P 30
        <UnitText>g</UnitText> · C 20
        <UnitText>g</UnitText> · F 34
        <UnitText>g</UnitText>
      </>
    ),
    rightMetric: (
      <Text as="span" variant="meta">
        3 items
      </Text>
    ),
    onOpen: () => undefined,
    onDelete: () => undefined,
  },
  {
    id: '2',
    title: 'Meals',
    meta: (
      <>
        640<UnitText> kcal</UnitText> · P 42
        <UnitText>g</UnitText> · C 18
        <UnitText>g</UnitText> · F 44
        <UnitText>g</UnitText>
      </>
    ),
    rightMetric: (
      <Text as="span" variant="meta">
        4 items
      </Text>
    ),
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
