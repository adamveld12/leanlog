import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../atoms/Button';
import { Text } from '../atoms/Text';
import { Modal } from './Modal';

const meta: Meta<typeof Modal> = {
  title: 'Design System/Molecules/Modal',
  component: Modal,
  args: {
    title: 'Confirm action',
    onClose: () => {},
    children: (
      <div className="flex flex-col gap-3">
        <Text as="p">Are you sure you want to proceed? This action cannot be undone.</Text>
        <Button variant="primary" size="sm">
          Confirm
        </Button>
      </div>
    ),
  },
};

export default meta;
type Story = StoryObj<typeof Modal>;

export const Open: Story = {
  args: { open: true },
};

export const Closed: Story = {
  args: { open: false },
};
