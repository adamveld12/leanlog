import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ReorderableList } from './ReorderableList';
import { HelperText } from '../atoms/HelperText';

const meta: Meta<typeof ReorderableList> = {
  title: 'Design System/Molecules/ReorderableList',
  component: ReorderableList,
};

export default meta;
type Story = StoryObj<typeof ReorderableList>;

function Demo() {
  const [items, setItems] = useState([
    { id: 'a', title: 'Breakfast', meta: <HelperText>2 ingredients</HelperText> },
    { id: 'b', title: 'Lunch', meta: <HelperText>no defaults</HelperText> },
    { id: 'c', title: 'Dinner', meta: <HelperText>1 ingredient</HelperText> },
    { id: 'd', title: 'Snack', meta: <HelperText>no defaults</HelperText> },
  ]);
  return (
    <ReorderableList
      items={items}
      onReorder={(orderedIds) =>
        setItems((prev) => orderedIds.map((id) => prev.find((i) => i.id === id)!))
      }
    />
  );
}

export const Default: Story = {
  render: () => <Demo />,
};
