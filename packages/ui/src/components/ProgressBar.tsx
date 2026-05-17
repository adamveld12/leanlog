type ProgressBarProps = {
  value: number;
  max: number;
};

export function ProgressBar({ value, max }: ProgressBarProps) {
  const percent = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
  return (
    <div style={{ height: 8, width: '100%', borderRadius: 999, background: '#e5e5e5' }}>
      <div
        style={{
          height: '100%',
          borderRadius: 999,
          background: '#171717',
          width: `${percent}%`,
          transition: 'width 200ms ease',
        }}
      />
    </div>
  );
}
