import { AnalyticsScope } from '../analytics/AnalyticsScope';
import { Button } from '../atoms/Button';
import { cn } from '../styles/cn';
import { recipes } from '../styles/recipes';

export type ThemePreference = 'system' | 'light' | 'dark';

// Icon-only options keep the header control compact (#56, R5). Each carries an
// aria-label so the emoji still has an accessible name.
const OPTIONS: { value: ThemePreference; icon: string; label: string }[] = [
  { value: 'system', icon: '⚙️', label: 'System theme' },
  { value: 'light', icon: '💡', label: 'Light theme' },
  { value: 'dark', icon: '🌝', label: 'Dark theme' },
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
      {/* A labelled cluster of related controls; role="group" is the correct ARIA
          semantic here and has no single matching HTML tag. */}
      {/* react-doctor-disable-next-line react-doctor/prefer-tag-over-role */}
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
            aria-label={opt.label}
            title={opt.label}
            // h-10 inside the p-0.5 container lands at ~44px, matching the Tabs
            // precedent for touch targets while staying compact.
            className={cn(recipes.radius.controlInner, 'h-10 px-2')}
            onClick={() => onChange(opt.value)}
          >
            {opt.icon}
          </Button>
        ))}
      </div>
    </AnalyticsScope>
  );
}
