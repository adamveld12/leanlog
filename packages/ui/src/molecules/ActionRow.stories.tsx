import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../atoms/Button';
import { ActionRow } from './ActionRow';

const meta: Meta<typeof ActionRow> = {
  title: 'Design System/Molecules/ActionRow',
  component: ActionRow,
};

export default meta;
type Story = StoryObj<typeof ActionRow>;

export const Default: Story = {
  args: {
    children: (
      <>
        <Button variant="subtle" size="sm">
          Cancel
        </Button>
        <Button variant="primary" size="sm">
          Save
        </Button>
      </>
    ),
  },
};

export const ThreeActions: Story = {
  args: {
    children: (
      <>
        <Button variant="danger" size="sm">
          Delete
        </Button>
        <Button variant="subtle" size="sm">
          Cancel
        </Button>
        <Button variant="primary" size="sm">
          Save
        </Button>
      </>
    ),
  },
};
