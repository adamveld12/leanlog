import type { PropsWithChildren } from 'react';

type SectionCardProps = PropsWithChildren<{ title?: string; saved?: boolean }>;

export function SectionCard({ title, saved, children }: SectionCardProps) {
  return (
    <section className={`ll-card ${saved ? 'll-card-saved' : ''}`}>
      {title ? <h3 className="ll-card-title">{title}</h3> : null}
      {children}
    </section>
  );
}
