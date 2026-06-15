import type { Meta, StoryObj } from '@storybook/react';
import { useRef } from 'react';
import { CameraCaptureModal } from './CameraCaptureModal';

function CameraCaptureModalDemo() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  return <CameraCaptureModal open videoRef={videoRef} onCapture={() => {}} onCancel={() => {}} />;
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
