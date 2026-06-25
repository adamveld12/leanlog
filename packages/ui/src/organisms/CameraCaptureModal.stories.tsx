import type { Meta, StoryObj } from '@storybook/react';
import { useRef } from 'react';
import { CameraCaptureModal } from './CameraCaptureModal';
import { SilhouetteGuide } from '../molecules/SilhouetteGuide';

function CameraCaptureModalDemo(props: {
  instructions?: string;
  withSkip?: boolean;
  withGuide?: boolean;
  title?: string;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  return (
    <CameraCaptureModal
      open
      title={props.title}
      videoRef={videoRef}
      onCapture={() => {}}
      onCancel={() => {}}
      instructions={props.instructions}
      overlay={props.withGuide ? <SilhouetteGuide poseLabel="Front" /> : undefined}
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

// Progress-photo capture (#69): a static silhouette overlays the viewfinder to
// standardize stance/distance/framing.
export const WithFramingGuide: Story = {
  render: () => (
    <CameraCaptureModalDemo
      title="Front progress photo"
      instructions="Line up with the outline, then capture."
      withGuide
    />
  ),
};
