import type { Meta, StoryObj } from '@storybook/react';
import { PhotoSlot } from './PhotoSlot';
import { Button } from '../atoms/Button';

const meta: Meta<typeof PhotoSlot> = {
  title: 'Design System/Molecules/PhotoSlot',
  component: PhotoSlot,
};

export default meta;
type Story = StoryObj<typeof PhotoSlot>;

const SAMPLE_SRC =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="%23d4d4d8"/><text x="200" y="210" font-size="32" text-anchor="middle" fill="%2352525b">Photo</text></svg>',
  );

export const Empty: Story = {
  args: {
    label: 'Product photo',
    hint: 'Front of package, optional.',
    actions: <Button size="sm">Add photo</Button>,
  },
};

export const WithPhoto: Story = {
  args: {
    label: 'Nutrition label',
    src: SAMPLE_SRC,
    alt: 'Nutrition facts label',
    actions: (
      <>
        <Button size="sm" variant="secondary">
          Replace
        </Button>
        <Button size="sm" variant="danger">
          Remove
        </Button>
      </>
    ),
  },
};

export const ReadOnly: Story = {
  args: {
    label: 'Product photo',
    src: SAMPLE_SRC,
    alt: 'Product front of package',
  },
};
