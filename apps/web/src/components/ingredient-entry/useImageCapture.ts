import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useAnalytics } from '@leanlog/ui';
import { api } from '../../api';
import { optimizeImage } from '../../image';

// Camera + file-fallback capture that optimizes and uploads a single photo to
// R2, handing the resulting content-addressed key back to the caller (#54).
//
// Shared by the create form's photo slots and the per-entry photo management on
// the Nutrition Facts page. Mirrors useDatabaseScan's camera plumbing but, where
// that hook ships the photo to the AI scanner, this one shrinks it client-side
// (~1600px JPEG) and stores it, returning the key via onUploaded.
export function useImageCapture({
  onUploaded,
  onError,
}: {
  onUploaded: (key: string) => void;
  onError?: (message: string) => void;
}) {
  const { getToken } = useAuth();
  const track = useAnalytics();
  const [uploading, setUploading] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  // Tracks whether the open camera is the guided "front photo" step, so the modal
  // can show a Skip action + front-of-package copy. Set inside startCapture (after
  // the async getUserMedia), keeping callers' effects free of synchronous setState.
  const [guided, setGuided] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // Latest onUploaded, read in the async upload path so the memoized callbacks
  // below stay stable across renders.
  const onUploadedRef = useRef(onUploaded);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onUploadedRef.current = onUploaded;
    onErrorRef.current = onError;
  });

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  // Unmount-only safety net: stop a live stream if the component goes away.
  // stopCamera is stable (useCallback []), so this still runs only on unmount.
  useEffect(() => () => stopCamera(), [stopCamera]);

  useEffect(() => {
    if (!cameraOpen || !videoRef.current || !streamRef.current) return;
    const video = videoRef.current;
    video.srcObject = streamRef.current;
    const onLoadedMetadata = () => void video.play();
    video.addEventListener('loadedmetadata', onLoadedMetadata);
    return () => {
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.srcObject = null;
    };
  }, [cameraOpen]);

  const uploadBlob = useCallback(
    async (blob: Blob) => {
      setUploading(true);
      try {
        const optimized = await optimizeImage(blob);
        const token = await getToken();
        if (!token) throw new Error('Not authenticated');
        const { key } = await api.nutritionDatabase.uploadImage(token, optimized);
        track('nutrition_facts.photo.uploaded', {});
        onUploadedRef.current(key);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Photo upload failed';
        track('nutrition_facts.photo.upload.error', { error: message });
        onErrorRef.current?.(message);
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [getToken, track],
  );

  // Opens the camera (falling back to the file picker). `isGuided` flags the
  // optional front-photo step. Memoized so callers can use it as an effect dep.
  const startCapture = useCallback(async ({ isGuided = false } = {}) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setGuided(isGuided);
      fileInputRef.current?.click();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
      });
      streamRef.current = stream;
      setGuided(isGuided);
      setCameraOpen(true);
    } catch {
      setGuided(isGuided);
      fileInputRef.current?.click();
    }
  }, []);

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    // Capture at high quality; optimizeImage handles the downscale + recompress.
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.92),
    );
    if (!blob) return;
    stopCamera();
    setCameraOpen(false);
    setGuided(false);
    await uploadBlob(blob);
  }, [stopCamera, uploadBlob]);

  const cancelCamera = useCallback(() => {
    stopCamera();
    setCameraOpen(false);
    setGuided(false);
  }, [stopCamera]);

  const onFileSelected = useCallback((file: File) => void uploadBlob(file), [uploadBlob]);

  return {
    uploading,
    cameraOpen,
    guided,
    fileInputRef,
    videoRef,
    startCapture,
    capturePhoto,
    cancelCamera,
    onFileSelected,
  };
}
