import type { RefObject } from 'react';
import { Button } from '../atoms/Button';
import { HelperText } from '../atoms/HelperText';
import { Modal } from '../molecules/Modal';
import { cn } from '../styles/cn';
import { recipes } from '../styles/recipes';

export type CameraCaptureModalProps = {
  open: boolean;
  videoRef: RefObject<HTMLVideoElement | null>;
  onCapture: () => void;
  onCancel: () => void;
  title?: string;
  /** Guidance shown above the viewfinder (e.g. which photo to take). */
  instructions?: string;
  /** When provided, renders a Skip action (e.g. skipping the optional front photo, #54). */
  onSkip?: () => void;
  skipLabel?: string;
};

export function CameraCaptureModal({
  open,
  videoRef,
  onCapture,
  onCancel,
  title = 'Take nutrition photo',
  instructions,
  onSkip,
  skipLabel = 'Skip',
}: CameraCaptureModalProps) {
  return (
    <Modal open={open} title={title} onClose={onCancel}>
      <div className={recipes.stack.sm}>
        {instructions ? <HelperText as="p">{instructions}</HelperText> : null}
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
          <div className={recipes.stack.row}>
            {onSkip ? (
              <Button variant="subtle" onClick={onSkip}>
                {skipLabel}
              </Button>
            ) : null}
            <Button onClick={onCapture}>Capture</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
