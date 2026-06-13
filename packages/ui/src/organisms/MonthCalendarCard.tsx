import { useMemo, useState } from 'react';
import { Button } from '../atoms/Button';
import { HelperText } from '../atoms/HelperText';
import { SectionHeading } from '../atoms/SectionHeading';
import { Text } from '../atoms/Text';
import { AnalyticsScope } from '../analytics';
import { SectionCard } from '../molecules/SectionCard';
import { cn } from '../styles/cn';
import { recipes } from '../styles/recipes';

type CalendarDay = {
  date: string;
  dayOfMonth: number;
  isToday: boolean;
  isFuture: boolean;
  status: 'tracked' | 'missed' | 'future';
  ariaHidden?: boolean;
  onTap?: () => void;
};

export type MonthCalendarCardProps = {
  trackedDates: Map<string, string>; // ISO 'yyyy-MM-dd' -> dayId
  onSelectDay: (dayId: string) => void;
  /** Tapping an untracked today/future day creates it. When omitted, those days
   *  stay disabled (view-only calendar). */
  onCreateDay?: (isoDate: string) => void;
  emptyHint?: string;
  initialMonth?: { year: number; month: number };
};

const DAY_HEADERS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

// Invisible placeholder that mirrors a nav button's footprint so the month
// title stays centered when the prev/next arrow is hidden. Composed from the
// sm control recipe so it tracks the Button's size if that ever changes.
const NAV_SPACER_CLS = cn(recipes.control.size.sm, 'invisible select-none');

function formatMonthTitle(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function buildCalendarDays(
  trackedDates: Map<string, string>,
  year: number,
  month: number,
  now: Date,
  onSelectDay: (dayId: string) => void,
  onCreateDay?: (isoDate: string) => void,
): CalendarDay[] {
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
      ariaHidden: true,
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isToday = dateStr === todayStr;
    const isFuture = new Date(year, month, d) > now;
    const dayId = trackedDates.get(dateStr);
    const status: CalendarDay['status'] =
      isFuture || isToday ? (dayId ? 'tracked' : 'future') : dayId ? 'tracked' : 'missed';

    // Tracked days open; untracked today/future days create-then-open (when a
    // create handler is supplied); past untracked days stay inert (R9).
    const onTap = dayId
      ? () => onSelectDay(dayId)
      : status === 'future' && onCreateDay
        ? () => onCreateDay(dateStr)
        : undefined;

    cells.push({ date: dateStr, dayOfMonth: d, isToday, isFuture, status, onTap });
  }

  return cells;
}

export function MonthCalendarCard({
  trackedDates,
  onSelectDay,
  onCreateDay,
  emptyHint,
  initialMonth,
}: MonthCalendarCardProps) {
  const [now] = useState(() => new Date());
  const [viewMonth, setViewMonth] = useState(
    () => initialMonth ?? { year: now.getFullYear(), month: now.getMonth() },
  );

  // Allow paging up to 12 months ahead so upcoming days can be pre-logged.
  const maxMonth = useMemo(() => {
    const ceil = new Date(now.getFullYear(), now.getMonth() + 12, 1);
    return { year: ceil.getFullYear(), month: ceil.getMonth() };
  }, [now]);

  const canGoNext =
    viewMonth.year < maxMonth.year ||
    (viewMonth.year === maxMonth.year && viewMonth.month < maxMonth.month);

  // Lower bound: don't page back past the earliest tracked month, or at least
  // 12 months back when there's no data, so navigation can't run away forever.
  const minMonth = useMemo(() => {
    const floor = new Date(now.getFullYear(), now.getMonth() - 12, 1);
    let earliest = floor;
    for (const key of trackedDates.keys()) {
      const [y, m] = key.split('-').map(Number);
      const d = new Date(y, m - 1, 1);
      if (d < earliest) earliest = d;
    }
    return { year: earliest.getFullYear(), month: earliest.getMonth() };
  }, [trackedDates, now]);

  const canGoPrev =
    viewMonth.year > minMonth.year ||
    (viewMonth.year === minMonth.year && viewMonth.month > minMonth.month);

  const days = useMemo(
    () =>
      buildCalendarDays(
        trackedDates,
        viewMonth.year,
        viewMonth.month,
        now,
        onSelectDay,
        onCreateDay,
      ),
    [trackedDates, viewMonth, now, onSelectDay, onCreateDay],
  );

  const title = formatMonthTitle(new Date(viewMonth.year, viewMonth.month, 1));

  function goPrevMonth() {
    if (!canGoPrev) return;
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
          {canGoPrev ? (
            <Button
              type="button"
              variant="subtle"
              size="sm"
              aria-label="Previous month"
              onClick={goPrevMonth}
            >
              ‹ Previous
            </Button>
          ) : (
            <Text as="span" aria-hidden className={NAV_SPACER_CLS}>
              ‹ Previous
            </Text>
          )}
          <div aria-live="polite" aria-atomic="true">
            <SectionHeading noMargin>{title}</SectionHeading>
          </div>
          {canGoNext ? (
            <Button
              type="button"
              variant="subtle"
              size="sm"
              aria-label="Next month"
              onClick={goNextMonth}
            >
              Next ›
            </Button>
          ) : (
            <Text as="span" aria-hidden className={NAV_SPACER_CLS}>
              Next ›
            </Text>
          )}
        </div>

        <div className={recipes.grid.calendar7}>
          {DAY_HEADERS.map((h) => (
            <Text key={h} as="span" variant="meta" className={recipes.calendar.dayHeader}>
              {h}
            </Text>
          ))}

          {days.map((day) => {
            const dayNumber = (
              <Text
                as="span"
                variant={day.status === 'future' ? 'meta' : undefined}
                className={
                  day.status === 'tracked'
                    ? recipes.text.tracked
                    : day.status === 'missed'
                      ? recipes.text.missed
                      : undefined
                }
              >
                {day.dayOfMonth}
              </Text>
            );

            // Previous-month overflow cells are purely visual padding: render a
            // non-interactive, aria-hidden container rather than a disabled
            // Button so aria-hidden never lands on a focusable element.
            if (day.ariaHidden) {
              return (
                <div
                  key={day.date}
                  aria-hidden
                  className={cn(recipes.calendar.cell, 'select-none opacity-50')}
                >
                  {dayNumber}
                </div>
              );
            }

            const label =
              day.status === 'tracked'
                ? `${day.dayOfMonth}, tracked`
                : day.status === 'missed'
                  ? `${day.dayOfMonth}, not tracked`
                  : day.onTap
                    ? day.isToday
                      ? `${day.dayOfMonth}, today, tap to log`
                      : `${day.dayOfMonth}, tap to add a day`
                    : day.isToday
                      ? `${day.dayOfMonth}, today`
                      : `${day.dayOfMonth}`;

            return (
              <Button
                key={day.date}
                type="button"
                variant="subtle"
                size="sm"
                disabled={!day.onTap}
                onClick={day.onTap}
                aria-label={label}
                className={cn(
                  recipes.calendar.cell,
                  // Today uses the neutral strong-line ring so it stays distinct
                  // from the accent focus-visible ring (recipes.focusRing).
                  day.isToday && recipes.ring.today,
                  day.onTap ? 'cursor-pointer' : 'disabled:cursor-default',
                )}
              >
                {dayNumber}
              </Button>
            );
          })}
        </div>

        <HelperText as="p" className="text-center">
          {onCreateDay
            ? 'Tap a logged day to open it, or tap today or an upcoming day to start logging.'
            : 'Tap a logged day to open it.'}
        </HelperText>

        {emptyHint && (
          <HelperText as="p" className="text-center">
            {emptyHint}
          </HelperText>
        )}
      </SectionCard>
    </AnalyticsScope>
  );
}
