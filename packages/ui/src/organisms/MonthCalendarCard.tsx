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
