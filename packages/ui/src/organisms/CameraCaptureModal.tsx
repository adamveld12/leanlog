import type { RefObject } from 'react';
import { Button } from '../atoms/Button';
import { Modal } from '../molecules/Modal';
import { cn } from '../styles/cn';
import { recipes } from '../styles/recipes';

export type CameraCaptureModalProps = {
  open: boolean;
  videoRef: RefObject<HTMLVideoElement | null>;
  onCapture: () => void;
  onCancel: () => void;
  title?: string;
};

export function CameraCaptureModal({
  open,
  videoRef,
  onCapture,
  onCancel,
  title = 'Take nutrition photo',
}: CameraCaptureModalProps) {
  return (
    <Modal open={open} title={title} onClose={onCancel}>
      <div className={recipes.stack.sm}>
        <video
          ref={videoRef}
          aria-label="Nutrition label viewfinder"
          className={cn(recipes.radius.control, 'w-full border border-[var(--ll-line)]')}
          autoPlay
          playsInline
          muted
        />
        <div className={cn(recipes.stack.row, recipes.stack.between)}>
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onCapture}>Capture</Button>
        </div>
      </div>
    </Modal>
  );
}
