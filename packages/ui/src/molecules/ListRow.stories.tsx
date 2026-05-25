import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../atoms/Button';
import { ListRow } from './ListRow';

const meta: Meta<typeof ListRow> = {
  title: 'Design System/Molecules/ListRow',
  component: ListRow,
  args: {
    title: 'Chicken breast',
    meta: '200g · 330 kcal',
  },
};

export default meta;
type Story = StoryObj<typeof ListRow>;

export const Default: Story = {};

export const WithRightMetric: Story = {
  args: {
    rightMetric: '330 kcal',
  },
};

export const WithActions: Story = {
  args: {
    actions: (
      <Button variant="danger" size="sm">
        Delete
      </Button>
    ),
  },
};

export const Clickable: Story = {
  args: {
    onOpen: () => alert('Row opened'),
  },
};

export const Full: Story = {
  args: {
    rightMetric: '330 kcal',
    actions: (
      <Button variant="danger" size="sm">
        Delete
      </Button>
    ),
    onOpen: () => alert('Row opened'),
  },
};
