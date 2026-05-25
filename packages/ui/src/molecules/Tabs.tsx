import { Button } from '../atoms/Button';

type Tab = { key: string; label: string };
type TabsProps = { tabs: Tab[]; active: string; onChange: (key: string) => void };

export function Tabs({ tabs, active, onChange }: TabsProps) {
  return (
    <div
      className="flex rounded-[10px] border border-[var(--ll-line)] p-0.5"
      role="tablist"
      aria-label="Tabs"
    >
      {tabs.map((tab) => (
        <Button
          type="button"
          key={tab.key}
          role="tab"
          aria-selected={active === tab.key}
          variant={active === tab.key ? 'primary' : 'subtle'}
          size="sm"
          className="my-0 h-[34px] flex-1 rounded-[8px]"
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
        </Button>
      ))}
    </div>
  );
}
