import { useEffect, useRef } from 'react';
import {
  Button,
  CameraCaptureModal,
  FileInput,
  PhotoSlot,
  recipes,
  WarningText,
} from '@leanlog/ui';
import { useImageCapture } from './useImageCapture';
import { nutritionImageUrl } from '../../image';

export type EntryPhotoSlot = 'product' | 'label';

const SLOT_META: Record<EntryPhotoSlot, { label: string; alt: string; hint: string }> = {
  product: {
    label: 'Product photo',
    alt: 'Front of product package',
    hint: 'Front of package (optional).',
  },
  label: {
    label: 'Nutrition label',
    alt: 'Nutrition facts label',
    hint: 'Nutrition Facts panel (optional).',
  },
};

export type EntryPhotoEditorProps = {
  productPhotoKey: string | null;
  labelPhotoKey: string | null;
  /** Persist a slot change: a key sets the photo, null clears it. */
  onChange: (slot: EntryPhotoSlot, key: string | null) => void;
  /** When false, the slots render read-only (no capture/remove controls). */
  editable?: boolean;
  /** Disables all controls (e.g. while a parent save is in flight). */
  disabled?: boolean;
  /** Error surfaced from a failed upload. */
  error?: string | null;
  onError?: (message: string) => void;
  // Increment to trigger the guided front-photo prompt after a label scan (#54,
  // Q4): a skippable camera step capturing the product photo. Each new value
  // opens the prompt once; the user captures or skips.
  guidedFrontPromptSignal?: number;
};

// Two photo slots (product + label) with camera/file capture, used by the create
// form and the per-entry management expand (#54). Capture is shared by a single
// camera modal; the slot being edited is tracked in a ref so the upload result
// is written to the right slot.
export function EntryPhotoEditor({
  productPhotoKey,
  labelPhotoKey,
  onChange,
  editable = true,
  disabled,
  error,
  onError,
  guidedFrontPromptSignal,
}: EntryPhotoEditorProps) {
  const activeSlotRef = useRef<EntryPhotoSlot | null>(null);
  const {
    uploading,
    cameraOpen,
    guided: guidedFront,
    fileInputRef,
    videoRef,
    startCapture,
    capturePhoto,
    cancelCamera,
    onFileSelected,
  } = useImageCapture({
    onUploaded: (key) => {
      const slot = activeSlotRef.current;
      if (slot) onChange(slot, key);
      activeSlotRef.current = null;
    },
    onError,
  });

  const beginCapture = (slot: EntryPhotoSlot) => {
    activeSlotRef.current = slot;
    void startCapture();
  };

  // After a label scan the page bumps guidedFrontPromptSignal; open the guided
  // skippable front-photo step (Q4). startCapture is memoized so the effect runs
  // only when the signal changes, not on every render.
  useEffect(() => {
    if (!editable || !guidedFrontPromptSignal) return;
    activeSlotRef.current = 'product';
    void startCapture({ isGuided: true });
  }, [guidedFrontPromptSignal, editable, startCapture]);

  const dismissGuided = () => {
    activeSlotRef.current = null;
    cancelCamera();
  };

  const keys: Record<EntryPhotoSlot, string | null> = {
    product: productPhotoKey,
    label: labelPhotoKey,
  };

  const renderSlot = (slot: EntryPhotoSlot) => {
    const meta = SLOT_META[slot];
    const key = keys[slot];
    const src = nutritionImageUrl(key);
    const actions = editable ? (
      <>
        <Button
          size="sm"
          variant="secondary"
          disabled={disabled || uploading}
          onClick={() => beginCapture(slot)}
        >
          {src ? 'Replace' : uploading ? 'Uploading…' : 'Add photo'}
        </Button>
        {src ? (
          <Button
            size="sm"
            variant="danger"
            disabled={disabled || uploading}
            onClick={() => onChange(slot, null)}
          >
            Remove
          </Button>
        ) : null}
      </>
    ) : undefined;
    return (
      <PhotoSlot
        label={meta.label}
        src={src}
        alt={meta.alt}
        hint={editable ? meta.hint : undefined}
        actions={actions}
      />
    );
  };

  return (
    <div className={recipes.stack.sm}>
      {error ? <WarningText role="alert">{error}</WarningText> : null}
      <div className={recipes.grid.two}>
        {renderSlot('label')}
        {renderSlot('product')}
      </div>
      <FileInput
        ref={fileInputRef}
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileSelected(file);
        }}
      />
      <CameraCaptureModal
        open={cameraOpen}
        videoRef={videoRef}
        title={guidedFront ? 'Add a front-of-package photo?' : 'Take photo'}
        instructions={
          guidedFront
            ? 'Optional: capture the front of the package, or skip to finish the label.'
            : undefined
        }
        onCapture={() => void capturePhoto()}
        onCancel={guidedFront ? dismissGuided : cancelCamera}
        onSkip={guidedFront ? dismissGuided : undefined}
        skipLabel="Skip"
      />
    </div>
  );
}
