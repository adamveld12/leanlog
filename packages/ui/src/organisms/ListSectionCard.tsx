import type { ReactNode } from 'react';
import { AnalyticsScope } from '../analytics/AnalyticsScope';
import { Button } from '../atoms/Button';
import { HelperText } from '../atoms/HelperText';
import { ListRow } from '../molecules/ListRow';
import { SectionCard } from '../molecules/SectionCard';
import { recipes } from '../styles/recipes';

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
    <AnalyticsScope properties={{ organism: 'ListSectionCard' }}>
      <SectionCard title={title} saved={saved}>
        {note ? <HelperText as="p">{note}</HelperText> : null}
        {childrenTop ? children : null}
        <div className={recipes.stack.sm}>
          {items.map((item) => {
            const actions = item.onDelete ? (
              <Button
                size="sm"
                variant="danger"
                className="min-w-[72px] shrink-0 px-3"
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
            return <div key={item.id}>{row}</div>;
          })}
          {items.length ? null : (
            <HelperText as="p" className="text-center">
              {emptyText}
            </HelperText>
          )}
        </div>
        {childrenTop ? null : children}
      </SectionCard>
    </AnalyticsScope>
  );
}
