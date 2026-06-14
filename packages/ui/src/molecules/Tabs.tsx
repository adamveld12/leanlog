import { useRef, type KeyboardEvent } from 'react';
import { AnalyticsScope } from '../analytics/AnalyticsScope';
import { Button } from '../atoms/Button';
import { cn } from '../styles/cn';
import { recipes } from '../styles/recipes';

type Tab = { key: string; label: string; panelId?: string };
type TabsProps = { tabs: Tab[]; active: string; onChange: (key: string) => void; label: string };

export function Tabs({ tabs, active, onChange, label }: TabsProps) {
  const listRef = useRef<HTMLDivElement>(null);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (!keys.includes(event.key)) return;
    event.preventDefault();

    const currentIndex = tabs.findIndex((t) => t.key === active);
    let nextIndex = currentIndex;

    if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    else if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = tabs.length - 1;

    const nextKey = tabs[nextIndex].key;
    onChange(nextKey);

    const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    buttons?.[nextIndex]?.focus();
  }

  return (
    <AnalyticsScope properties={{ molecule: 'Tabs' }}>
      {/* WAI-ARIA tabs pattern: the tablist is not focusable; focus lives on the tabs via a
          roving tabIndex (set per-tab below). So the container intentionally has no tabIndex. */}
      {/* react-doctor-disable-next-line react-doctor/interactive-supports-focus */}
      <div
        ref={listRef}
        className={cn(recipes.radius.control, 'flex border border-[var(--ll-line)] p-0.5')}
        role="tablist"
        aria-label={label}
        onKeyDown={handleKeyDown}
      >
        {tabs.map((tab) => (
          <Button
            type="button"
            key={tab.key}
            id={tab.panelId ? `${tab.panelId}-tab` : undefined}
            role="tab"
            aria-selected={active === tab.key}
            aria-controls={tab.panelId}
            tabIndex={active === tab.key ? 0 : -1}
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
