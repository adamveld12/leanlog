// Client-side image optimization for nutrition-entry photos (#54).
//
// Phone photos are multi-MB; we downscale the long edge to a sane cap and
// re-encode to JPEG before upload so R2 stores small, uniform objects and the
// content-addressed key dedupes identical captures. The heavy lifting uses the
// canvas API, but the sizing math is split out as a pure function so it can be
// unit-tested without a DOM.

export const MAX_IMAGE_DIMENSION = 1600;
export const JPEG_QUALITY = 0.8;

// Public URL for a stored nutrition photo key (e.g. `nutrition/<sha>.jpg`).
// Served by functions/images/nutrition/[key].ts, outside the /api Clerk guard,
// so it works in plain <img> tags. Returns null for an empty/missing key so
// callers can branch with a single nullish value.
export function nutritionImageUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  return `/images/${key}`;
}

export type Dimensions = { width: number; height: number };

/**
 * Fits (width, height) within a square of side `max`, preserving aspect ratio.
 * Never upscales; rounds to whole pixels and clamps to a minimum of 1px.
 */
export function computeTargetSize(width: number, height: number, max: number): Dimensions {
  const longEdge = Math.max(width, height);
  if (longEdge <= max) return { width, height };
  const scale = max / longEdge;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

async function decode(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(file);
  }
  // Fallback for environments without createImageBitmap.
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to decode image'));
      img.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function dimensionsOf(source: ImageBitmap | HTMLImageElement): Dimensions {
  if ('naturalWidth' in source) {
    return { width: source.naturalWidth, height: source.naturalHeight };
  }
  return { width: source.width, height: source.height };
}

/**
 * Downscales and re-encodes an image file to a JPEG Blob (~1600px long edge,
 * quality ~0.8). Returns a Blob suitable for direct upload as `image/jpeg`.
 */
export async function optimizeImage(
  file: Blob,
  opts: { maxDimension?: number; quality?: number } = {},
): Promise<Blob> {
  const max = opts.maxDimension ?? MAX_IMAGE_DIMENSION;
  const quality = opts.quality ?? JPEG_QUALITY;

  const source = await decode(file);
  const { width, height } = dimensionsOf(source);
  const target = computeTargetSize(width, height, max);

  const canvas = document.createElement('canvas');
  canvas.width = target.width;
  canvas.height = target.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.drawImage(source, 0, 0, target.width, target.height);
  if ('close' in source) source.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', quality),
  );
  if (!blob) throw new Error('Failed to encode image');
  return blob;
}
