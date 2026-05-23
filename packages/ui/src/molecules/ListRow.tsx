import type { KeyboardEvent, ReactNode } from 'react';
import { cn } from '../styles/cn';

export type ListRowProps = {
  title: ReactNode;
  meta?: ReactNode;
  rightMetric?: ReactNode;
  actions?: ReactNode;
  onOpen?: () => void;
  className?: string;
};

export function ListRow({
  title,
  meta,
  rightMetric,
  actions,
  onOpen,
  className = '',
}: ListRowProps) {
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!onOpen) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpen();
    }
  };
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-2 rounded-[10px] px-1.5 py-0 hover:bg-[color-mix(in_srgb,var(--ll-line)_25%,transparent)]',
        onOpen && 'cursor-pointer',
        className,
      )}
      role={onOpen ? 'link' : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onClick={onOpen}
      onKeyDown={onKeyDown}
    >
      <div className="flex flex-col gap-2.5">
        <span className="text-sm font-medium text-[var(--ll-text)]">{title}</span>
        {meta ? (
          <small className="text-xs font-medium text-[var(--ll-text-muted)]">{meta}</small>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        {rightMetric}
        {actions}
      </div>
    </div>
  );
}
