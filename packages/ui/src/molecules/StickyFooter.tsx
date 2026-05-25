import type { PropsWithChildren } from 'react';

export function StickyFooter({ children }: PropsWithChildren) {
  return (
    <footer className="sticky bottom-0 border-t border-[var(--ll-line)] bg-[color-mix(in_srgb,var(--ll-surface)_92%,var(--ll-bg))] py-3">
      {children}
    </footer>
  );
}
