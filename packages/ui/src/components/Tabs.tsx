type Tab = { key: string; label: string };

type TabsProps = { tabs: Tab[]; active: string; onChange: (key: string) => void };

export function Tabs({ tabs, active, onChange }: TabsProps) {
  return (
    <div className="ll-tabs">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          className={active === tab.key ? 'active' : ''}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
