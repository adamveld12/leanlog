import { useId, type PropsWithChildren } from 'react';
import { AnalyticsScope } from '../analytics';
import { Button } from '../atoms/Button';
import { Text } from '../atoms/Text';
import { cn } from '../styles/cn';
import { recipes } from '../styles/recipes';

export function Modal({
  open,
  title,
  children,
  onClose,
}: PropsWithChildren<{ open: boolean; title: string; onClose: () => void }>) {
  const titleId = useId();
  if (!open) return null;
  return (
    <AnalyticsScope properties={{ molecule: 'Modal' }}>
      <div
        className="fixed inset-0 z-20 grid place-items-center bg-black/45 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div
          className={cn(
            recipes.radius.card,
            recipes.surface.card,
            'w-full max-w-[560px] p-4 text-[var(--ll-text)] shadow-[0_10px_24px_rgb(0_0_0/0.12)]',
          )}
        >
          <div className={cn(recipes.stack.rowBetween, 'mb-3')}>
            <Text as="h3" id={titleId} variant="subheading">
              {title}
            </Text>
            <Button variant="subtle" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
          <div className={recipes.stack.md}>{children}</div>
        </div>
      </div>
    </AnalyticsScope>
  );
}
