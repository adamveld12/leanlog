import type { ImgHTMLAttributes } from 'react';
import { cn } from '../styles/cn';

export type ImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'> & {
  /** Image URL (or object URL). Null/undefined renders nothing so callers own the empty state. */
  src?: string | null;
  /** Accessible alt text (required). */
  alt: string;
};

// The single sanctioned <img> wrapper (atom): renders a photo cover-fitted to its
// container, or nothing when there is no src. Used for private progress-photo
// tiles (#69), where an organism would otherwise need a raw <img>.
export function Image({ src, alt, className, ...props }: ImageProps) {
  if (!src) return null;
  return (
    <img src={src} alt={alt} className={cn('h-full w-full object-cover', className)} {...props} />
  );
}
