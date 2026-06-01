import type { PropsWithChildren } from 'react';
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
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-20 grid place-items-center bg-black/45 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-[560px] rounded-[14px] border border-[var(--ll-line)] bg-[var(--ll-surface)] p-3 text-[var(--ll-text)] shadow-[0_10px_24px_rgb(0_0_0/0.12)]">
        <div className={cn(recipes.stack.rowBetween, 'mb-3')}>
          <Text as="h3" className="text-sm font-semibold tracking-tight">
            {title}
          </Text>
          <Button variant="subtle" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className={recipes.stack.md}>{children}</div>
      </div>
    </div>
  );
}
