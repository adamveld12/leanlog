import type { Meta, StoryObj } from '@storybook/react';
import { Image } from './Image';

const meta: Meta<typeof Image> = {
  title: 'Design System/Atoms/Image',
  component: Image,
};

export default meta;
type Story = StoryObj<typeof Image>;

const SAMPLE_SRC =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="%23d4d4d8"/><text x="200" y="210" font-size="32" text-anchor="middle" fill="%2352525b">Photo</text></svg>',
  );

export const Default: Story = {
  args: { src: SAMPLE_SRC, alt: 'Sample progress photo' },
  render: (args) => (
    <div style={{ width: 200, aspectRatio: '1', overflow: 'hidden' }}>
      <Image {...args} />
    </div>
  ),
};

export const Empty: Story = {
  args: { src: null, alt: 'No photo' },
};
