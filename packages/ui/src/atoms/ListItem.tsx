import type { LiHTMLAttributes, PropsWithChildren } from 'react';
import { cn } from '../styles/cn';

type ListItemProps = PropsWithChildren<LiHTMLAttributes<HTMLLIElement>>;

// Semantic list row. Pairs with <List> to give native <li> semantics instead of
// role="listitem" on a <div>. Forwards drag/keyboard/data props so molecules can compose it.
export function ListItem({ children, className = '', ...props }: ListItemProps) {
  return (
    <li className={cn(className)} {...props}>
      {children}
    </li>
  );
}
