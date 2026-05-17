type ProgressBarProps = {
  value: number;
  max: number;
};

export function ProgressBar({ value, max }: ProgressBarProps) {
  const percent = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
  return (
    <div className="h-2 w-full rounded-full" style={{ background: 'var(--ll-line)' }}>
      <div
        className="h-full rounded-full transition-[width] duration-150"
        style={{ width: `${percent}%`, background: 'var(--ll-text)' }}
      />
    </div>
  );
}
