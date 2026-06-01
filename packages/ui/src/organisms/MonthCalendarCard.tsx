import { useMemo, useState } from 'react';
import { Button } from '../atoms/Button';
import { HelperText } from '../atoms/HelperText';
import { SectionHeading } from '../atoms/SectionHeading';
import { Text } from '../atoms/Text';
import { AnalyticsScope } from '../analytics';
import { SectionCard } from '../molecules/SectionCard';
import { cn } from '../styles/cn';
import { recipes } from '../styles/recipes';

export type CalendarDay = {
  date: string;
  dayOfMonth: number;
  isToday: boolean;
  isFuture: boolean;
  status: 'tracked' | 'missed' | 'future';
  onTap?: () => void;
};

export type MonthCalendarCardProps = {
  trackedDates: Map<string, string>; // ISO 'yyyy-MM-dd' -> dayId
  onSelectDay: (dayId: string) => void;
  emptyHint?: string;
  initialMonth?: { year: number; month: number };
};

const DAY_HEADERS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function formatMonthTitle(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function buildCalendarDays(
  trackedDates: Map<string, string>,
  year: number,
  month: number,
  onSelectDay: (dayId: string) => void,
): CalendarDay[] {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // ISO week: Monday = 0
  let startOffset = firstDay.getDay() - 1;
  if (startOffset < 0) startOffset = 6;

  const cells: CalendarDay[] = [];

  // Padding from previous month
  const prevMonthDays = new Date(year, month, 0).getDate();
  for (let i = startOffset - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    const prevMonth = month === 0 ? 12 : month;
    const prevYear = month === 0 ? year - 1 : year;
    const dateStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({
      date: dateStr,
      dayOfMonth: d,
      isToday: false,
      isFuture: false,
      status: 'future' as const,
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isToday = dateStr === todayStr;
    const isFuture = new Date(year, month, d) > now;
    const dayId = trackedDates.get(dateStr);

    cells.push({
      date: dateStr,
      dayOfMonth: d,
      isToday,
      isFuture,
      status: isFuture || isToday ? (dayId ? 'tracked' : 'future') : dayId ? 'tracked' : 'missed',
      onTap: dayId ? () => onSelectDay(dayId) : undefined,
    });
  }

  return cells;
}

export function MonthCalendarCard({
  trackedDates,
  onSelectDay,
  emptyHint,
  initialMonth,
}: MonthCalendarCardProps) {
  const now = useMemo(() => new Date(), []);
  const [viewMonth, setViewMonth] = useState(
    () => initialMonth ?? { year: now.getFullYear(), month: now.getMonth() },
  );

  const canGoNext =
    viewMonth.year < now.getFullYear() ||
    (viewMonth.year === now.getFullYear() && viewMonth.month < now.getMonth());

  const days = useMemo(
    () => buildCalendarDays(trackedDates, viewMonth.year, viewMonth.month, onSelectDay),
    [trackedDates, viewMonth, onSelectDay],
  );

  const title = formatMonthTitle(new Date(viewMonth.year, viewMonth.month, 1));

  function goPrevMonth() {
    const d = new Date(viewMonth.year, viewMonth.month - 1, 1);
    setViewMonth({ year: d.getFullYear(), month: d.getMonth() });
  }

  function goNextMonth() {
    if (!canGoNext) return;
    const d = new Date(viewMonth.year, viewMonth.month + 1, 1);
    setViewMonth({ year: d.getFullYear(), month: d.getMonth() });
  }

  return (
    <AnalyticsScope properties={{ organism: 'MonthCalendarCard' }}>
      <SectionCard>
        <div className={cn(recipes.stack.row, recipes.stack.between)}>
          <Button
            type="button"
            variant="subtle"
            size="sm"
            aria-label="Previous month"
            onClick={goPrevMonth}
          >
            ‹
          </Button>
          <SectionHeading noMargin>{title}</SectionHeading>
          {canGoNext ? (
            <Button
              type="button"
              variant="subtle"
              size="sm"
              aria-label="Next month"
              onClick={goNextMonth}
            >
              ›
            </Button>
          ) : (
            <div aria-hidden className="h-9 w-9" />
          )}
        </div>

        <div className="grid grid-cols-7 gap-0.5">
          {DAY_HEADERS.map((h) => (
            <Text key={h} as="span" variant="meta" className="py-1 text-center">
              {h}
            </Text>
          ))}

          {days.map((day) => (
            <Button
              key={day.date}
              type="button"
              variant="subtle"
              size="sm"
              disabled={day.status !== 'tracked'}
              onClick={day.onTap}
              aria-label={
                day.status === 'tracked'
                  ? `${day.dayOfMonth}, tracked`
                  : day.status === 'missed'
                    ? `${day.dayOfMonth}, not tracked`
                    : `${day.dayOfMonth}`
              }
              className={[
                'my-0 flex min-h-[44px] items-center justify-center rounded-[10px]',
                day.isToday && 'ring-2 ring-[var(--ll-focus)]',
                day.status === 'tracked' && 'cursor-pointer',
                day.status !== 'tracked' && 'cursor-default',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <Text
                as="span"
                variant={day.status === 'future' ? 'meta' : undefined}
                className={
                  day.status === 'tracked'
                    ? 'font-semibold text-[var(--ll-saved)]'
                    : day.status === 'missed'
                      ? 'font-semibold text-[var(--ll-danger)]'
                      : undefined
                }
              >
                {day.dayOfMonth}
              </Text>
            </Button>
          ))}
        </div>

        {emptyHint && (
          <HelperText as="p" className="mt-3 text-center">
            {emptyHint}
          </HelperText>
        )}
      </SectionCard>
    </AnalyticsScope>
  );
}
