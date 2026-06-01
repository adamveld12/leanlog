import type { Meta, StoryObj } from '@storybook/react';
import { ScanReviewModal } from './ScanReviewModal';

const baseFields = [
  { label: 'Calories', current: 220, proposed: 310, unit: ' kcal' },
  { label: 'Fat', current: 6, proposed: 9, unit: 'g' },
  { label: 'Protein', current: 42, proposed: 38, unit: 'g' },
  { label: 'Carbs', current: 0, proposed: 4, unit: 'g' },
];

const meta: Meta<typeof ScanReviewModal> = {
  title: 'Design System/Organisms/ScanReviewModal',
  component: ScanReviewModal,
  args: {
    open: true,
    fields: baseFields,
    canAccept: true,
    onClose: () => {},
    onAccept: () => {},
    onRetake: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof ScanReviewModal>;

export const Open: Story = {};

export const Closed: Story = {
  args: { open: false },
};

export const WithNotes: Story = {
  args: {
    notes: ['Scan confidence: high.', 'Values rounded to nearest gram.'],
  },
};

export const Blocked: Story = {
  args: {
    canAccept: false,
    blockReason: 'Scanned values could not be verified. Please retake the photo.',
  },
};

export const NoRetake: Story = {
  args: {
    onRetake: undefined,
  },
};

export const WithWarning: Story = {
  args: {
    canAccept: true,
    warning:
      'Servings per container unreadable. Applied a single serving — adjust the weight if needed.',
  },
};
