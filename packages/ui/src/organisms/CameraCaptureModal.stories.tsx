import type { Meta, StoryObj } from '@storybook/react';
import { useRef } from 'react';
import { CameraCaptureModal } from './CameraCaptureModal';

function CameraCaptureModalDemo(props: { instructions?: string; withSkip?: boolean }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  return (
    <CameraCaptureModal
      open
      videoRef={videoRef}
      onCapture={() => {}}
      onCancel={() => {}}
      instructions={props.instructions}
      onSkip={props.withSkip ? () => {} : undefined}
      skipLabel="Skip front photo"
    />
  );
}

const meta: Meta<typeof CameraCaptureModal> = {
  title: 'Design System/Organisms/CameraCaptureModal',
  component: CameraCaptureModal,
};

export default meta;
type Story = StoryObj<typeof CameraCaptureModal>;

export const Open: Story = {
  render: () => <CameraCaptureModalDemo />,
};

export const GuidedWithSkip: Story = {
  render: () => (
    <CameraCaptureModalDemo
      instructions="Step 2 of 2: take a photo of the front of the package, or skip."
      withSkip
    />
  ),
};
