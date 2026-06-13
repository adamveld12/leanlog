import { useState, type DragEvent, type ReactNode } from 'react';
import { AnalyticsScope } from '../analytics/AnalyticsScope';
import { Button } from '../atoms/Button';
import { HelperText } from '../atoms/HelperText';
import { Text } from '../atoms/Text';
import { cn } from '../styles/cn';
import { recipes } from '../styles/recipes';

export type ReorderableItem = {
  id: string;
  title: ReactNode;
  meta?: ReactNode;
  onOpen?: () => void;
};

export type ReorderableListProps = {
  items: ReorderableItem[];
  /** Called with the full list of ids in their new order. */
  onReorder: (orderedIds: string[]) => void;
};

function move(ids: string[], from: number, to: number): string[] {
  if (to < 0 || to >= ids.length) return ids;
  const next = [...ids];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

// A list whose rows can be reordered by dragging (pointer) or with the
// Up/Down buttons (keyboard and accessibility fallback). See issue #41 (R6).
export function ReorderableList({ items, onReorder }: ReorderableListProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const ids = items.map((i) => i.id);

  const commit = (from: number, to: number) => {
    const next = move(ids, from, to);
    if (next !== ids) onReorder(next);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>, to: number) => {
    e.preventDefault();
    if (dragIndex !== null && dragIndex !== to) commit(dragIndex, to);
    setDragIndex(null);
  };

  return (
    <AnalyticsScope properties={{ molecule: 'ReorderableList' }}>
      <div role="list" className={recipes.stack.sm}>
        {items.map((item, index) => (
          <div
            key={item.id}
            role="listitem"
            draggable
            onDragStart={() => setDragIndex(index)}
            onDragEnd={() => setDragIndex(null)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => onDrop(e, index)}
            className={cn(
              recipes.stack.row,
              recipes.stack.between,
              recipes.radius.control,
              'min-h-[44px] px-1.5 py-0 hover:bg-[color-mix(in_srgb,var(--ll-line)_25%,transparent)]',
              dragIndex === index && 'opacity-60',
            )}
          >
            <div
              className={cn(recipes.stack.row, 'min-w-0 flex-1', item.onOpen && 'cursor-pointer')}
              role={item.onOpen ? 'button' : undefined}
              tabIndex={item.onOpen ? 0 : undefined}
              onClick={item.onOpen}
              onKeyDown={(e) => {
                if (!item.onOpen) return;
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  item.onOpen();
                }
              }}
            >
              <HelperText as="span" aria-hidden className="cursor-grab select-none px-1">
                ⠿
              </HelperText>
              <div className={cn(recipes.stack.xs, 'min-w-0')}>
                <Text as="span" className="font-medium">
                  {item.title}
                </Text>
                {item.meta}
              </div>
            </div>
            <div className={cn(recipes.stack.row, 'shrink-0')}>
              <Button
                size="sm"
                variant="ghost"
                aria-label="Move up"
                disabled={index === 0}
                onClick={() => commit(index, index - 1)}
              >
                ↑
              </Button>
              <Button
                size="sm"
                variant="ghost"
                aria-label="Move down"
                disabled={index === items.length - 1}
                onClick={() => commit(index, index + 1)}
              >
                ↓
              </Button>
            </div>
          </div>
        ))}
      </div>
    </AnalyticsScope>
  );
}
