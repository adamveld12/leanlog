import { useState, type PropsWithChildren } from 'react';
import { Button } from '../atoms/Button';

export function SwipeRow({
  children,
  onDelete,
  deleteLabel = 'Delete',
}: PropsWithChildren<{ onDelete: () => void; deleteLabel?: string }>) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="relative overflow-hidden"
      onTouchStart={() => setOpen(false)}
      onTouchEnd={() => setOpen(true)}
    >
      <div
        className={
          open
            ? '-translate-x-20 transition-transform duration-[140ms] ease-[var(--ll-ease)]'
            : 'transition-transform duration-[140ms] ease-[var(--ll-ease)]'
        }
      >
        {children}
      </div>
      <Button
        type="button"
        variant="danger"
        size="sm"
        className="absolute right-0 top-0 my-0 hidden h-full rounded-none px-3 text-xs text-white max-[768px]:inline-flex"
        onClick={onDelete}
      >
        {deleteLabel}
      </Button>
    </div>
  );
}
