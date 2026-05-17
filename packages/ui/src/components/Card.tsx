import type { PropsWithChildren } from 'react';

export function Card({ children }: PropsWithChildren) {
  return <section className="ll-card">{children}</section>;
}
