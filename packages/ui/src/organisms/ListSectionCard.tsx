import type { ReactNode } from 'react';
import { Button } from '../atoms/Button';
import { ListRow } from '../molecules/ListRow';
import { SectionCard } from '../molecules/SectionCard';
import { SwipeRow } from '../molecules/SwipeRow';

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
      {note ? <p className="text-xs font-medium text-[var(--ll-text-muted)]">{note}</p> : null}
      {childrenTop ? children : null}
      <div className="flex flex-col gap-2.5">
        {items.map((item) => {
          const actions = item.onDelete ? (
            <Button
              size="sm"
              variant="danger"
              className="hidden min-[769px]:inline-flex"
              onClick={(e) => {
                e.stopPropagation();
                item.onDelete?.();
              }}
            >
              {item.deleteLabel ?? 'Delete'}
            </Button>
          ) : null;
          const row = (
            <ListRow
              title={item.title}
              meta={item.meta}
              rightMetric={item.rightMetric}
              actions={actions}
              onOpen={item.onOpen}
            />
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
        {items.length ? null : (
          <p className="text-center text-xs font-medium text-[var(--ll-text-muted)]">{emptyText}</p>
        )}
      </div>
      {childrenTop ? null : children}
    </SectionCard>
  );
}
