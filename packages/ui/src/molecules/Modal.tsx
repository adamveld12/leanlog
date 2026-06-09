import { useId, useRef, useEffect, type PropsWithChildren } from 'react';
import { AnalyticsScope } from '../analytics';
import { Button } from '../atoms/Button';
import { Text } from '../atoms/Text';
import { cn } from '../styles/cn';
import { recipes } from '../styles/recipes';

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));
}

export function Modal({
  open,
  title,
  children,
  onClose,
}: PropsWithChildren<{ open: boolean; title: string; onClose: () => void }>) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  // Capture the element that had focus before the modal opened so we can restore it.
  const returnFocusRef = useRef<Element | null>(null);

  // Store the pre-open focused element and restore it when the modal closes/unmounts.
  useEffect(() => {
    if (open) {
      returnFocusRef.current = document.activeElement;
    }
    return () => {
      if (returnFocusRef.current instanceof HTMLElement) {
        returnFocusRef.current.focus();
      }
    };
  }, [open]);

  // Move focus into the dialog when it opens; also handles Escape and Tab trap.
  useEffect(() => {
    if (!open || !dialogRef.current) return;

    const container = dialogRef.current;

    // Initial focus: first focusable child, or the container itself.
    const focusable = getFocusable(container);
    if (focusable.length > 0) {
      focusable[0].focus();
    } else {
      container.focus();
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key !== 'Tab') return;

      const items = getFocusable(container);
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];

      if (e.shiftKey) {
        // Shift+Tab from first → wrap to last.
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        // Tab from last → wrap to first.
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown);
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <AnalyticsScope properties={{ molecule: 'Modal' }}>
      <div
        ref={dialogRef}
        // tabIndex allows the container to receive focus when no child is focusable.
        tabIndex={-1}
        className="fixed inset-0 z-20 grid place-items-center bg-black/45 p-4 outline-none"
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
