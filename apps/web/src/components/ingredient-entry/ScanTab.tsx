import { useEffect, useReducer, useRef } from 'react';
import { useAuth } from '@clerk/clerk-react';
import {
  CameraCaptureModal,
  FileInput,
  LabelScanCard,
  ScanReviewModal,
  recipes,
  useAnalytics,
  type ScanField,
} from '@leanlog/ui';
import type { ScanResolution } from '@leanlog/data-access';
import { api } from '../../api';
import { DraftEntryCard } from './DraftEntryCard';
import { initialScanState, scanReducer } from './scanReducer';
import type { IngredientDraft } from './types';

function buildScanFields(draft: IngredientDraft, scan: ScanResolution): ScanField[] {
  return [
    {
      label: 'Name',
      current: draft.name || '—',
      proposed: scan.proposed.name ? `${scan.proposed.name} (detected)` : '—',
    },
    { label: 'Weight', current: draft.weight ?? '—', proposed: scan.proposed.weight, unit: 'g' },
    {
      label: 'Calories',
      current: draft.calories != null ? draft.calories : '(will estimate)',
      proposed: scan.proposed.calories,
    },
    { label: 'Fat', current: draft.fat ?? '—', proposed: scan.proposed.fat, unit: 'g' },
    {
      label: 'Saturated fat',
      current: draft.saturatedFat ?? '—',
      proposed: scan.proposed.saturatedFat,
      unit: 'g',
    },
    { label: 'Carbs', current: draft.carbs ?? '—', proposed: scan.proposed.carbs, unit: 'g' },
    { label: 'Fiber', current: draft.fiber ?? '—', proposed: scan.proposed.fiber, unit: 'g' },
    { label: 'Protein', current: draft.protein ?? '—', proposed: scan.proposed.protein, unit: 'g' },
  ];
}

export type ScanTabProps = {
  draft: IngredientDraft;
  editingId: string | null;
  draftSource: 'manual' | 'scanned';
  analyticsContext: 'meal' | 'template';
  onDraftChange: (draft: IngredientDraft) => void;
  onApplyScan: (patch: Partial<IngredientDraft>) => void;
  onSubmit: () => void;
  onCancel: () => void;
};

export function ScanTab({
  draft,
  editingId,
  draftSource,
  analyticsContext,
  onDraftChange,
  onApplyScan,
  onSubmit,
  onCancel,
}: ScanTabProps) {
  const { getToken } = useAuth();
  const track = useAnalytics();
  const [scan, dispatch] = useReducer(scanReducer, initialScanState);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  // Unmount-only safety net: stop whatever camera stream is live when the component goes
  // away. The cleanup must read the *latest* streamRef.current (the stream is assigned long
  // after mount), so capturing it into a local would defeat the purpose.
  // react-doctor-disable-next-line react-doctor/exhaustive-deps
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  useEffect(() => {
    if (!scan.cameraOpen || !videoRef.current || !streamRef.current) return;
    const video = videoRef.current;
    video.srcObject = streamRef.current;
    const onLoadedMetadata = () => {
      void video.play();
    };
    video.addEventListener('loadedmetadata', onLoadedMetadata);
    return () => {
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.srcObject = null;
    };
  }, [scan.cameraOpen]);

  const openCamera = async () => {
    dispatch({ type: 'cameraOpening' });
    if (!navigator.mediaDevices?.getUserMedia) {
      fileInputRef.current?.click();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
      });
      streamRef.current = stream;
      dispatch({ type: 'cameraOpened' });
    } catch {
      dispatch({ type: 'cameraFailed', error: 'Camera unavailable. Falling back to file picker.' });
      fileInputRef.current?.click();
    }
  };

  const onScanFile = async (file: File) => {
    dispatch({ type: 'scanStart' });
    try {
      const formData = new FormData();
      formData.append('photo', file);
      const isServings = scan.form.mode === 'servings';
      const isPackage = scan.form.mode === 'package';
      formData.append('mode', isServings ? 'servings' : 'weight');
      formData.append('entirePackage', String(isPackage));
      formData.append(
        'weightGrams',
        scan.form.mode === 'weight' ? String(scan.form.amount ?? '') : '',
      );
      formData.append('servings', isServings ? String(scan.form.amount ?? '') : '');
      formData.append('name', '');
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      const result = await api.scanNutrition(token, formData);
      track(`${analyticsContext}.ingredient.scanned`, {});
      dispatch({ type: 'scanSucceeded', result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Scan failed';
      track(`${analyticsContext}.ingredient.scanned.error`, { error: message });
      dispatch({ type: 'scanFailed', error: message });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.92),
    );
    if (!blob) return;
    stopCamera();
    dispatch({ type: 'cameraClosed' });
    await onScanFile(new File([blob], 'nutrition.jpg', { type: 'image/jpeg' }));
  };

  // Applying a meal scan only prefills the draft (R12 — labels are created only
  // on the database tab, never as a side effect of applying a scan to a meal).
  const applyScan = () => {
    if (!scan.result || !scan.result.canApply) return;
    const { proposed } = scan.result;
    onApplyScan({
      name: proposed.name ?? draft.name,
      weight: proposed.weight,
      calories: proposed.calories > 0 ? proposed.calories : null,
      fat: proposed.fat,
      saturatedFat: proposed.saturatedFat,
      carbs: proposed.carbs,
      fiber: proposed.fiber,
      protein: proposed.protein,
      sugarAlcohol: proposed.sugarAlcohol ?? null,
      allulose: proposed.allulose ?? null,
      sourceDatabaseIngredientId: null,
    });
    dispatch({ type: 'clearResult' });
    dispatch({ type: 'resetForm' });
  };

  return (
    <>
      <div className={recipes.stack.sm}>
        <LabelScanCard
          value={scan.form}
          loading={scan.loading}
          error={scan.error || scan.cameraError}
          onChange={(form) => dispatch({ type: 'setForm', form })}
          onScan={openCamera}
        />
        {draftSource === 'scanned' ? (
          <DraftEntryCard
            draft={draft}
            editingId={editingId}
            onChange={onDraftChange}
            onSubmit={onSubmit}
            onCancel={onCancel}
          />
        ) : null}
      </div>
      <FileInput
        ref={fileInputRef}
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void onScanFile(file);
        }}
      />
      <CameraCaptureModal
        open={scan.cameraOpen}
        videoRef={videoRef}
        onCapture={() => void capturePhoto()}
        onCancel={() => {
          stopCamera();
          dispatch({ type: 'cameraClosed' });
        }}
      />
      <ScanReviewModal
        open={!!scan.result}
        onClose={() => dispatch({ type: 'clearResult' })}
        onAccept={() => applyScan()}
        onRetake={() => {
          dispatch({ type: 'clearResult' });
          void openCamera();
        }}
        canAccept={scan.result?.canApply ?? false}
        blockReason={scan.result?.blockReason}
        warning={scan.result?.warning}
        notes={scan.result?.notes}
        fields={scan.result ? buildScanFields(draft, scan.result) : []}
      />
    </>
  );
}
