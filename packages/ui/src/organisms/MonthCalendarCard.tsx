import { Button } from '../atoms/Button';
import { HelperText } from '../atoms/HelperText';
import { Text } from '../atoms/Text';
import { AnalyticsScope } from '../analytics';
import { SectionCard } from '../molecules/SectionCard';

export type CalendarDay = {
  date: string;
  dayOfMonth: number;
  isToday: boolean;
  isFuture: boolean;
  status: 'tracked' | 'missed' | 'future';
  onTap?: () => void;
};

export type MonthCalendarCardProps = {
  title: string;
  days: CalendarDay[];
  emptyHint?: string;
};

const DAY_HEADERS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

export function MonthCalendarCard({ title, days, emptyHint }: MonthCalendarCardProps) {
  return (
    <AnalyticsScope properties={{ organism: 'MonthCalendarCard' }}>
      <SectionCard title={title}>
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
              aria-label={`${day.dayOfMonth} ${day.status}`}
              className={[
                'my-0 flex min-h-[44px] items-center justify-center rounded-[10px]',
                day.isToday && 'ring-2 ring-[var(--ll-focus)]',
                day.status === 'tracked' && 'cursor-pointer',
                day.status !== 'tracked' && 'cursor-default',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {day.status === 'tracked' && (
                <Text as="span" className="font-semibold text-[var(--ll-saved)]">
                  ✓
                </Text>
              )}
              {day.status === 'missed' && (
                <Text as="span" className="font-semibold text-[var(--ll-danger)]">
                  ✗
                </Text>
              )}
              {day.status === 'future' && (
                <Text as="span" variant="meta">
                  {day.dayOfMonth}
                </Text>
              )}
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
