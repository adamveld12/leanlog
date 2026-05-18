import type { ReactNode } from 'react';
import { Button } from './Button';
import { SectionCard } from './SectionCard';
import { SwipeRow } from './SwipeRow';

export type ListSectionItem = {
  id: string;
  title: string;
  meta?: ReactNode;
  rightMetric?: ReactNode;
  onOpen?: () => void;
  onDelete?: () => void;
  deleteLabel?: string;
};

type ListSectionCardProps = {
  title: string;
  items: ListSectionItem[];
  emptyText?: string;
  saved?: boolean;
  note?: string;
  children?: ReactNode;
  childrenTop?: boolean;
};

export function ListSectionCard({
  title,
  items,
  emptyText = 'No items',
  saved,
  note,
  children,
  childrenTop = false,
}: ListSectionCardProps) {
  return (
    <SectionCard title={title} saved={saved}>
      {note ? <p className="ll-section-note">{note}</p> : null}
      {childrenTop ? children : null}
      <div className="ll-stack">
        {items.map((item) => {
          const row = (
            <div
              className="ll-list-row ll-row-link"
              role="link"
              tabIndex={0}
              onClick={item.onOpen}
              onKeyDown={(e) => {
                if (!item.onOpen) return;
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  item.onOpen();
                }
              }}
            >
              <div className="ll-stack">
                <span className="text-sm font-medium">{item.title}</span>
                {item.meta ? <small className="ll-meta">{item.meta}</small> : null}
              </div>
              <div className="ll-row">
                {item.rightMetric}
                {item.onDelete ? (
                  <Button
                    size="sm"
                    variant="danger"
                    className="desktop-only"
                    onClick={(e) => {
                      e.stopPropagation();
                      item.onDelete?.();
                    }}
                  >
                    {item.deleteLabel ?? 'Delete'}
                  </Button>
                ) : null}
              </div>
            </div>
          );

          if (!item.onDelete) return <div key={item.id}>{row}</div>;

          return (
            <SwipeRow
              key={item.id}
              onDelete={item.onDelete}
              deleteLabel={item.deleteLabel ?? 'Delete'}
            >
              {row}
            </SwipeRow>
          );
        })}
        {items.length ? null : <p className="ll-section-note">{emptyText}</p>}
      </div>
      {childrenTop ? null : children}
    </SectionCard>
  );
}
