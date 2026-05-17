import { useState, type PropsWithChildren } from 'react';

type SwipeRowProps = PropsWithChildren<{ onDelete: () => void; deleteLabel: string }>;

export function SwipeRow({ children, onDelete, deleteLabel }: SwipeRowProps) {
  const [startX, setStartX] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  return (
    <div className={`ll-swipe ${open ? 'open' : ''}`}>
      <div
        onTouchStart={(e) => setStartX(e.touches[0]?.clientX ?? null)}
        onTouchEnd={(e) => {
          if (startX == null) return;
          const dx = (e.changedTouches[0]?.clientX ?? startX) - startX;
          if (dx < -40) setOpen(true);
          if (dx > 40) setOpen(false);
          setStartX(null);
        }}
      >
        {children}
      </div>
      <button type="button" className="ll-swipe-delete" onClick={onDelete}>
        {deleteLabel}
      </button>
    </div>
  );
}
