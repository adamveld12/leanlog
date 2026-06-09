import type { KeyboardEvent, ReactNode } from 'react';
import { AnalyticsScope } from '../analytics';
import { HelperText } from '../atoms/HelperText';
import { Text } from '../atoms/Text';
import { cn } from '../styles/cn';
import { recipes } from '../styles/recipes';

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
    <AnalyticsScope properties={{ molecule: 'ListRow' }}>
      <div
        className={cn(
          recipes.stack.row,
          recipes.stack.between,
          recipes.radius.control,
          'min-h-[44px] px-1.5 py-0 hover:bg-[color-mix(in_srgb,var(--ll-line)_25%,transparent)]',
          onOpen && 'cursor-pointer',
          className,
        )}
        role={onOpen ? 'link' : undefined}
        tabIndex={onOpen ? 0 : undefined}
        onClick={onOpen}
        onKeyDown={onKeyDown}
      >
        <div className={recipes.stack.xs}>
          <Text as="span" className="font-medium">
            {title}
          </Text>
          {meta ? <HelperText>{meta}</HelperText> : null}
        </div>
        <div className={cn(recipes.stack.row, 'shrink-0')}>
          {rightMetric ? <div className="whitespace-nowrap">{rightMetric}</div> : null}
          {actions}
        </div>
      </div>
    </AnalyticsScope>
  );
}
