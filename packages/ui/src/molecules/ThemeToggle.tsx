import { AnalyticsScope } from '../analytics/AnalyticsScope';
import { Button } from '../atoms/Button';
import { cn } from '../styles/cn';
import { recipes } from '../styles/recipes';

export type ThemePreference = 'system' | 'light' | 'dark';

function prefersDark(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );
}

export type ThemeToggleProps = {
  value: ThemePreference;
  onChange: (value: ThemePreference) => void;
};

// A single icon that flips between light and dark (#56, R5). The app defaults to
// system mode; the first tap pins an explicit theme. The emoji reflects the
// current effective theme — 💡 light, 🌝 dark.
export function ThemeToggle({ value, onChange }: ThemeToggleProps) {
  const isDark = value === 'dark' || (value === 'system' && prefersDark());
  const next: ThemePreference = isDark ? 'light' : 'dark';
  const label = `Switch to ${next} theme`;
  return (
    <AnalyticsScope properties={{ molecule: 'ThemeToggle' }}>
      <Button
        type="button"
        variant="subtle"
        size="sm"
        aria-label={label}
        title={label}
        className={cn(recipes.radius.control, 'h-11 min-w-[44px] px-2 text-lg')}
        onClick={() => onChange(next)}
      >
        {isDark ? '🌝' : '💡'}
      </Button>
    </AnalyticsScope>
  );
}
