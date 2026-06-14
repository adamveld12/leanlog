type ProgressBarProps = {
  value: number;
  max: number;
  color?: string;
  'aria-label'?: string;
  'aria-valuetext'?: string;
};

export function ProgressBar({
  value,
  max,
  color,
  'aria-label': ariaLabel,
  'aria-valuetext': ariaValuetext,
}: ProgressBarProps) {
  const clampedValue = Math.max(0, value);
  const percent = Math.max(0, Math.min(100, (clampedValue / Math.max(1, max)) * 100));
  return (
    // A native <progress> can't render the custom token-driven track/fill styling we need,
    // so the ARIA progressbar role on a styled element is intentional.
    // react-doctor-disable-next-line react-doctor/prefer-tag-over-role
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuenow={Math.round(clampedValue)}
      aria-valuemax={Math.round(max)}
      aria-label={ariaLabel}
      aria-valuetext={ariaValuetext}
      className="h-2 w-full rounded-full"
      style={{ background: 'var(--ll-line)' }}
    >
      <div
        className="h-full rounded-full transition-[width] duration-150"
        style={{ width: `${percent}%`, background: color ?? 'var(--ll-text)' }}
      />
    </div>
  );
}
