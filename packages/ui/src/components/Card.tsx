import type { PropsWithChildren } from 'react';

export function Card({ children }: PropsWithChildren) {
  return (
    <section
      style={{
        borderRadius: 16,
        border: '1px solid #e5e5e5',
        background: '#fff',
        padding: 16,
      }}
    >
      {children}
    </section>
  );
}
