import type { PropsWithChildren } from 'react';

export function StickyFooter({ children }: PropsWithChildren) {
  return <footer className="ll-sticky-footer">{children}</footer>;
}
