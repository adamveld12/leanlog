import type { ReactNode } from 'react';
import { AnalyticsScope } from '../analytics/AnalyticsScope';
import { HelperText } from '../atoms/HelperText';
import { SectionHeading } from '../atoms/SectionHeading';
import { cn } from '../styles/cn';
import { recipes } from '../styles/recipes';

export type PhotoSlotProps = {
  /** Slot label, e.g. "Product photo" or "Nutrition label". */
  label: string;
  /** Public image URL when a photo is set; null/undefined renders the empty placeholder. */
  src?: string | null;
  /** Accessible alt text for the photo (required when `src` is set). */
  alt?: string;
  /** Helper copy shown under the tile (e.g. capture guidance). */
  hint?: string;
  /** Action controls (Add / Replace / Remove buttons) supplied by the caller. */
  actions?: ReactNode;
};

// A single photo tile for a nutrition entry (#54): shows the stored photo or an
// empty placeholder, plus a caller-supplied action area. Presentational only —
// capture/upload/remove behavior lives in the app layer so the molecule stays
// dependency-free and reusable for both the product and label slots.
export function PhotoSlot({ label, src, alt, hint, actions }: PhotoSlotProps) {
  return (
    <AnalyticsScope properties={{ molecule: 'PhotoSlot', slot: label }}>
      <div className={recipes.stack.xs}>
        <SectionHeading noMargin>{label}</SectionHeading>
        <div
          className={cn(
            recipes.radius.control,
            recipes.surface.card,
            'flex aspect-square w-full items-center justify-center overflow-hidden',
          )}
        >
          {src ? (
            <img src={src} alt={alt ?? label} className="h-full w-full object-cover" />
          ) : (
            <HelperText as="p">No photo</HelperText>
          )}
        </div>
        {actions ? <div className={recipes.stack.actions}>{actions}</div> : null}
        {hint ? <HelperText as="p">{hint}</HelperText> : null}
      </div>
    </AnalyticsScope>
  );
}
