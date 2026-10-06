// "2026-10-06" → "Tue, Oct 6" (built from local parts, so no time-zone shift).
export function formatDayHeading(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}
