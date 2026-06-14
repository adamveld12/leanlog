import type { HTMLAttributes, PropsWithChildren } from 'react';
import { cn } from '../styles/cn';

type ListProps = PropsWithChildren<HTMLAttributes<HTMLUListElement>>;

// Semantic list container. Atoms are the one place raw elements live, so this gives the rest
// of the system a real <ul> (native list semantics) instead of role="list" on a <div>.
export function List({ children, className = '', ...props }: ListProps) {
  return (
    <ul className={cn('m-0 list-none p-0', className)} {...props}>
      {children}
    </ul>
  );
}
