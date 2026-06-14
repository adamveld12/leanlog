import type { Meta, StoryObj } from '@storybook/react';
import { List } from './List';
import { ListItem } from './ListItem';
import { Text } from './Text';

const meta: Meta<typeof List> = {
  title: 'Design System/Atoms/List',
  component: List,
};

export default meta;
type Story = StoryObj<typeof List>;

export const Default: Story = {
  args: {
    children: (
      <>
        <ListItem>
          <Text as="span">First item</Text>
        </ListItem>
        <ListItem>
          <Text as="span">Second item</Text>
        </ListItem>
        <ListItem>
          <Text as="span">Third item</Text>
        </ListItem>
      </>
    ),
  },
};
