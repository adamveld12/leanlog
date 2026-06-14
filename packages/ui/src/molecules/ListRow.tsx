import type { KeyboardEvent, ReactNode } from 'react';
import { AnalyticsScope } from '../analytics/AnalyticsScope';
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
    // Only activate when the row itself is focused — keydown from child action buttons bubbles
    // here, and without this guard Enter/Space on a Delete/Save button would also fire onOpen.
    if (e.target !== e.currentTarget) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpen();
    }
  };
  const rowClass = cn(
    recipes.stack.row,
    recipes.stack.between,
    recipes.radius.control,
    'min-h-[44px] px-1.5 py-0 hover:bg-[color-mix(in_srgb,var(--ll-line)_25%,transparent)]',
    onOpen && 'cursor-pointer',
    className,
  );
  const content = (
    <>
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
    </>
  );
  return (
    <AnalyticsScope properties={{ molecule: 'ListRow' }}>
      {onOpen ? (
        // The whole row is the click target and it wraps sibling action buttons, so a native
        // button element would nest interactive content. role="button" + tabIndex + keyboard
        // is the correct accessible pattern here.
        // react-doctor-disable-next-line react-doctor/prefer-tag-over-role
        <div role="button" tabIndex={0} onClick={onOpen} onKeyDown={onKeyDown} className={rowClass}>
          {content}
        </div>
      ) : (
        <div className={rowClass}>{content}</div>
      )}
    </AnalyticsScope>
  );
}
