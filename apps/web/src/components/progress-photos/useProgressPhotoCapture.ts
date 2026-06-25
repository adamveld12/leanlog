import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useAnalytics } from '@leanlog/ui';
import { api } from '../../api';
import { optimizeImage } from '../../image';

// Camera + gallery capture for private progress photos (#69). Mirrors
// useImageCapture's camera plumbing but uploads to the per-user progress path and
// returns the resulting key via onUploaded. Two explicit entry points keep camera
// and gallery both first-class (R2): `startCamera` opens the live viewfinder
// (where the silhouette guide is shown), while `startImport` goes straight to the
// file picker (no guide, R5). Camera falls back to the picker when unavailable.
export function useProgressPhotoCapture({
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
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
        const { key } = await api.progressPhotos.uploadImage(token, optimized);
        track('progress_photo.uploaded', {});
        onUploadedRef.current(key);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Photo upload failed';
        track('progress_photo.upload.error', { error: message });
        onErrorRef.current?.(message);
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [getToken, track],
  );

  // Open the live camera (with file-picker fallback) — the framing guide is shown
  // over this viewfinder.
  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      fileInputRef.current?.click();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
      });
      streamRef.current = stream;
      setCameraOpen(true);
    } catch {
      fileInputRef.current?.click();
    }
  }, []);

  // Go straight to the gallery / file picker — no live camera, no framing guide.
  const startImport = useCallback(() => {
    fileInputRef.current?.click();
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
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.92),
    );
    if (!blob) return;
    stopCamera();
    setCameraOpen(false);
    await uploadBlob(blob);
  }, [stopCamera, uploadBlob]);

  const cancelCamera = useCallback(() => {
    stopCamera();
    setCameraOpen(false);
  }, [stopCamera]);

  const onFileSelected = useCallback((file: File) => void uploadBlob(file), [uploadBlob]);

  return {
    uploading,
    cameraOpen,
    fileInputRef,
    videoRef,
    startCamera,
    startImport,
    capturePhoto,
    cancelCamera,
    onFileSelected,
  };
}
