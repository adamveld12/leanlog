import type { Meta, StoryObj } from '@storybook/react';
import { List } from './List';
import { ListItem } from './ListItem';
import { Text } from './Text';

const meta: Meta<typeof ListItem> = {
  title: 'Design System/Atoms/ListItem',
  component: ListItem,
  decorators: [
    (Story) => (
      <List>
        <Story />
      </List>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ListItem>;

export const Default: Story = {
  args: {
    children: <Text as="span">A single list item</Text>,
  },
};
