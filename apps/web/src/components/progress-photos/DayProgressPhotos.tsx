import { useRef, useState } from 'react';
import {
  Button,
  CameraCaptureModal,
  FileInput,
  PhotoSlot,
  SectionCard,
  SilhouetteGuide,
  WarningText,
  recipes,
} from '@leanlog/ui';
import { POSE_TO_KEY, type DailyMealLog, type ProgressPose } from '@leanlog/data-access';
import { useProgressPhotoCapture } from './useProgressPhotoCapture';
import { useProgressPhotoUrl } from './useProgressPhotoUrl';

const POSES: { pose: ProgressPose; label: string; alt: string }[] = [
  { pose: 'front', label: 'Front', alt: 'Front progress photo' },
  { pose: 'side', label: 'Side', alt: 'Side progress photo' },
  { pose: 'back', label: 'Back', alt: 'Back progress photo' },
];

// One pose tile: shows the stored photo (resolved through the auth proxy) plus
// Camera / Import / Remove controls. Named so its busy state survives re-renders.
function DayProgressPhotoTile({
  label,
  alt,
  photoKey,
  uploading,
  onCamera,
  onImport,
  onRemove,
}: {
  label: string;
  alt: string;
  photoKey: string | null;
  uploading: boolean;
  onCamera: () => void;
  onImport: () => void;
  onRemove: () => void;
}) {
  const src = useProgressPhotoUrl(photoKey);
  const has = photoKey != null;
  const actions = (
    <>
      <Button variant="secondary" disabled={uploading} onClick={onCamera}>
        {has ? 'Replace' : uploading ? 'Uploading…' : 'Camera'}
      </Button>
      <Button variant="ghost" disabled={uploading} onClick={onImport}>
        Import
      </Button>
      {has ? (
        <Button variant="danger" disabled={uploading} onClick={onRemove}>
          Remove
        </Button>
      ) : null}
    </>
  );
  return (
    <PhotoSlot
      label={label}
      src={src}
      alt={alt}
      hint={has ? undefined : 'Optional'}
      actions={actions}
    />
  );
}

// The day-page progress-photo capture surface (#69). Rendered only for the
// current day (capture is current-day-only, R4/R17). Three fixed pose slots, each
// fillable by live camera (with a silhouette framing guide, R5) or gallery import
// (R2); recapturing replaces the slot (R3).
export function DayProgressPhotos({
  day,
  onChange,
}: {
  day: DailyMealLog;
  onChange: (pose: ProgressPose, key: string | null) => void;
}) {
  const activePoseRef = useRef<ProgressPose | null>(null);
  const [activeLabel, setActiveLabel] = useState('Front');
  const [error, setError] = useState<string | null>(null);

  const {
    uploading,
    cameraOpen,
    fileInputRef,
    videoRef,
    startCamera,
    startImport,
    capturePhoto,
    cancelCamera,
    onFileSelected,
  } = useProgressPhotoCapture({
    onUploaded: (key) => {
      const pose = activePoseRef.current;
      if (pose) onChange(pose, key);
      activePoseRef.current = null;
    },
    onError: setError,
  });

  const beginCamera = (pose: ProgressPose, label: string) => {
    activePoseRef.current = pose;
    setActiveLabel(label);
    setError(null);
    void startCamera();
  };

  const beginImport = (pose: ProgressPose) => {
    activePoseRef.current = pose;
    setError(null);
    startImport();
  };

  return (
    <SectionCard title="Progress Photos">
      {error ? <WarningText role="alert">{error}</WarningText> : null}
      <div className={recipes.grid.three}>
        {POSES.map(({ pose, label, alt }) => (
          <DayProgressPhotoTile
            key={pose}
            label={label}
            alt={alt}
            photoKey={day[POSE_TO_KEY[pose]]}
            uploading={uploading}
            onCamera={() => beginCamera(pose, label)}
            onImport={() => beginImport(pose)}
            onRemove={() => onChange(pose, null)}
          />
        ))}
      </div>
      <FileInput
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileSelected(file);
        }}
      />
      <CameraCaptureModal
        open={cameraOpen}
        videoRef={videoRef}
        title={`${activeLabel} progress photo`}
        instructions="Line up with the outline, then capture."
        viewfinderLabel={`${activeLabel} progress photo viewfinder`}
        overlay={<SilhouetteGuide />}
        onCapture={() => void capturePhoto()}
        onCancel={cancelCamera}
      />
    </SectionCard>
  );
}
