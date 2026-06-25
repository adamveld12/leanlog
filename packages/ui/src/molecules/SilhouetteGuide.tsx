import { cn } from '../styles/cn';
import { recipes } from '../styles/recipes';

export type SilhouetteGuideProps = {
  /** Pose announced to assistive tech, e.g. "Front", "Side", "Back". */
  poseLabel?: string;
  className?: string;
};

// A static, translucent body outline overlaid on the live camera viewfinder to
// standardize stance, distance, and framing (#69, R5). It is a fixed framing aid
// — deliberately NOT the user's previous photo (onion-skin alignment is out of
// scope) — and generic across poses. Pointer-events are off so it never blocks
// the capture controls beneath it.
export function SilhouetteGuide({ poseLabel, className }: SilhouetteGuideProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(recipes.stack.centerBox, 'pointer-events-none absolute inset-0', className)}
    >
      <svg
        viewBox="0 0 100 200"
        role="img"
        aria-label={poseLabel ? `${poseLabel} framing guide` : 'Framing guide'}
        className="h-[88%] w-auto text-white opacity-40"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        <circle cx="50" cy="24" r="14" />
        <path d="M50 38 L50 48" />
        <path d="M32 52 Q50 44 68 52 L78 96 L70 100 L64 60" />
        <path d="M36 60 L30 100 L22 96 L32 52" />
        <path d="M40 58 L36 120 L40 188 L48 188 L50 130" />
        <path d="M60 58 L64 120 L60 188 L52 188 L50 130" />
      </svg>
    </div>
  );
}
