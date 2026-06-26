import type { PropsWithChildren, ReactNode } from 'react';
import { AnalyticsScope } from '../analytics/AnalyticsScope';
import { Button } from '../atoms/Button';
import { recipes } from '../styles/recipes';

// A controlled disclosure: the parent owns `open` so it can drive collapse from
// derived state (e.g. collapse once a value is logged) and force a section open
// under a hard block. Stateless on purpose, so it never trips the derived-state
// lint — the reset logic lives in the owning organism.
export type CollapsibleProps = PropsWithChildren<{
  open: boolean;
  onToggle: () => void;
  // Compact content shown when collapsed (e.g. the logged value).
  summary: ReactNode;
  // Toggle label when collapsed / expanded.
  editLabel?: string;
  collapseLabel?: string;
  // Hard block: always render children and render NO toggle, so the section
  // can't be dismissed until its requirement is satisfied (#68).
  locked?: boolean;
}>;

export function Collapsible({
  open,
  onToggle,
  summary,
  editLabel = 'Edit',
  collapseLabel = 'Collapse',
  locked = false,
  children,
}: CollapsibleProps) {
  if (locked) {
    return (
      <AnalyticsScope properties={{ molecule: 'Collapsible' }}>
        <div className={recipes.stack.sm}>{children}</div>
      </AnalyticsScope>
    );
  }

  if (!open) {
    return (
      <AnalyticsScope properties={{ molecule: 'Collapsible' }}>
        <div className={recipes.stack.rowBetween}>
          <div className="min-w-0">{summary}</div>
          <Button type="button" variant="subtle" size="sm" className="shrink-0" onClick={onToggle}>
            {editLabel}
          </Button>
        </div>
      </AnalyticsScope>
    );
  }

  return (
    <AnalyticsScope properties={{ molecule: 'Collapsible' }}>
      <div className={recipes.stack.sm}>
        <div className={recipes.stack.rowEnd}>
          <Button type="button" variant="subtle" size="sm" onClick={onToggle}>
            {collapseLabel}
          </Button>
        </div>
        {children}
      </div>
    </AnalyticsScope>
  );
}
