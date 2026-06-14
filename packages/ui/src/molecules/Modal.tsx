import { useId, useRef, useEffect, type PropsWithChildren } from 'react';
import { AnalyticsScope } from '../analytics/AnalyticsScope';
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
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Drive the native dialog open/close state from the `open` prop.
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open) {
      // showModal places the element in the top layer, makes background content
      // inert, traps focus, and restores focus on close — all natively.
      if (!el.open) el.showModal();
    } else {
      if (el.open) el.close();
    }
  }, [open]);

  return (
    <AnalyticsScope properties={{ molecule: 'Modal' }}>
      {/*
       * The dialog is always mounted so the effect can call showModal/close.
       * When closed (no `open` attribute, managed by showModal()/close()),
       * browser UA styles give the dialog display:none, removing it from
       * layout and the accessibility tree.
       */}
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        // onCancel fires on Escape; prevent the UA default close so our handler
        // controls state, then delegate to onClose.
        onCancel={(e) => {
          e.preventDefault();
          onClose();
        }}
        // onClose fires when the dialog closes by any means (including .close()).
        onClose={onClose}
        className={cn(
          recipes.radius.card,
          recipes.surface.card,
          // m-auto centers the dialog in the top layer (Tailwind preflight resets
          // the UA margin:auto that native dialog relies on for centering).
          'm-auto w-full max-w-[560px] p-4 text-[var(--ll-text)] shadow-[0_10px_24px_rgb(0_0_0/0.12)] outline-none',
          // Semi-transparent backdrop via CSS backdrop pseudo-element.
          'backdrop:bg-black/45',
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
      </dialog>
    </AnalyticsScope>
  );
}
