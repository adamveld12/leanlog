import { AnalyticsScope } from '../analytics/AnalyticsScope';
import { Button } from '../atoms/Button';
import { cn } from '../styles/cn';
import { recipes } from '../styles/recipes';

export type ThemePreference = 'system' | 'light' | 'dark';

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'Auto' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export type ThemeToggleProps = {
  value: ThemePreference;
  onChange: (value: ThemePreference) => void;
};

// Compact system/light/dark switch (#56, R5) that lives next to the Clerk user
// control in the app header, replacing the old Settings-page theme section.
export function ThemeToggle({ value, onChange }: ThemeToggleProps) {
  return (
    <AnalyticsScope properties={{ molecule: 'ThemeToggle' }}>
      <div
        className={cn(recipes.radius.control, 'flex border border-[var(--ll-line)] p-0.5')}
        role="group"
        aria-label="Theme"
      >
        {OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            type="button"
            size="sm"
            variant={value === opt.value ? 'primary' : 'subtle'}
            aria-pressed={value === opt.value}
            className={recipes.radius.controlInner}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
      </div>
    </AnalyticsScope>
  );
}
