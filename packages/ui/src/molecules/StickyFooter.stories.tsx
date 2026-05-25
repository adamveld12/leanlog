import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../atoms/Button';
import { Text } from '../atoms/Text';
import { StickyFooter } from './StickyFooter';

const meta: Meta<typeof StickyFooter> = {
  title: 'Design System/Molecules/StickyFooter',
  component: StickyFooter,
  decorators: [
    (Story) => (
      <div style={{ minHeight: '200px', position: 'relative' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof StickyFooter>;

export const Default: Story = {
  args: {
    children: (
      <div className="flex items-center justify-between px-4">
        <Text as="span">3 items logged</Text>
        <Button variant="primary" size="sm">
          Save day
        </Button>
      </div>
    ),
  },
};

export const SingleAction: Story = {
  args: {
    children: (
      <div className="px-4">
        <Button variant="primary">Save changes</Button>
      </div>
    ),
  },
};
