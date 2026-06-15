import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useAnalytics } from '@leanlog/ui';
import type { ScanResolution } from '@leanlog/data-access';
import { api } from '../../api';

// Camera + strict-scan plumbing for the Nutrition Facts Database tab. Owns the
// camera stream, file fallback, and scan request; hands the resolved scan back
// to the caller (which stages it into the label form). Keeps DatabaseTab lean.
export function useDatabaseScan({
  analyticsContext,
  onResult,
  onError,
}: {
  analyticsContext: 'meal' | 'template';
  onResult: (result: ScanResolution) => void;
  onError: (message: string) => void;
}) {
  const { getToken } = useAuth();
  const track = useAnalytics();
  const [scanning, setScanning] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  // Unmount-only safety net: stop a live stream when the tab goes away. Must read
  // the latest streamRef.current (assigned long after mount).
  // react-doctor-disable-next-line react-doctor/exhaustive-deps
  useEffect(() => () => stopCamera(), []);

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

  const scanFile = async (file: File) => {
    setScanning(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);
      formData.append('mode', 'weight');
      formData.append('entirePackage', 'false');
      formData.append('weightGrams', '');
      formData.append('servings', '');
      formData.append('name', '');
      // Database-tab scans are stricter (R15).
      formData.append('strict', 'true');
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      const result = await api.scanNutrition(token, formData);
      track(`${analyticsContext}.ingredient.scanned`, { target: 'database' });
      onResult(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Scan failed';
      track(`${analyticsContext}.ingredient.scanned.error`, { error: message });
      onError(message);
    } finally {
      setScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const openCamera = async () => {
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
    setCameraOpen(false);
    await scanFile(new File([blob], 'nutrition.jpg', { type: 'image/jpeg' }));
  };

  const cancelCamera = () => {
    stopCamera();
    setCameraOpen(false);
  };

  return {
    scanning,
    cameraOpen,
    fileInputRef,
    videoRef,
    openCamera,
    capturePhoto,
    cancelCamera,
    onFileSelected: (file: File) => void scanFile(file),
  };
}
