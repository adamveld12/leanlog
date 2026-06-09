import { AnalyticsScope } from '../analytics';
import { Button } from '../atoms/Button';
import { cn } from '../styles/cn';
import { recipes } from '../styles/recipes';

type Tab = { key: string; label: string };
type TabsProps = { tabs: Tab[]; active: string; onChange: (key: string) => void; label: string };

export function Tabs({ tabs, active, onChange, label }: TabsProps) {
  return (
    <AnalyticsScope properties={{ molecule: 'Tabs' }}>
      <div
        className={cn(recipes.radius.control, 'flex border border-[var(--ll-line)] p-0.5')}
        role="tablist"
        aria-label={label}
      >
        {tabs.map((tab) => (
          <Button
            type="button"
            key={tab.key}
            role="tab"
            aria-selected={active === tab.key}
            variant={active === tab.key ? 'primary' : 'subtle'}
            size="sm"
            className={cn('h-10 flex-1', recipes.radius.controlInner)}
            onClick={() => onChange(tab.key)}
          >
            {tab.label}
          </Button>
        ))}
      </div>
    </AnalyticsScope>
  );
}
