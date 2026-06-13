import { useState } from 'react';
import { AnalyticsScope } from '../analytics/AnalyticsScope';
import { Button } from '../atoms/Button';
import { HelperText } from '../atoms/HelperText';
import { WarningText } from '../atoms/WarningText';
import { DateSelect3 } from '../molecules/DateSelect3';
import { SectionCard } from '../molecules/SectionCard';

export type AddDayValue = {
  month: number;
  day: number;
  year: number;
};

export type AddDayControlProps = {
  onDayAdded: (next: AddDayValue) => void;
  month?: number;
  day?: number;
  year?: number;
  title?: string;
  note?: string;
  buttonLabel?: string;
  disabled?: boolean;
};

function toIso({ month, day, year }: AddDayValue): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function todayIso(): string {
  const now = new Date();
  return toIso({ month: now.getMonth() + 1, day: now.getDate(), year: now.getFullYear() });
}

export function AddDayControl({
  onDayAdded,
  month,
  day,
  year,
  title = 'Add day',
  note = 'Choose month, day, and year to create a new log day. Meals come from your templates.',
  buttonLabel = 'Add day',
  disabled = false,
}: AddDayControlProps) {
  const [picker, setPicker] = useState<AddDayValue>(() => {
    const now = new Date();
    return {
      month: month ?? now.getMonth() + 1,
      day: day ?? now.getDate(),
      year: year ?? now.getFullYear(),
    };
  });

  // Days can only be created for today or a future local date (R9).
  const isPast = toIso(picker) < todayIso();

  return (
    <AnalyticsScope properties={{ organism: 'AddDayControl' }}>
      <SectionCard title={title}>
        {note ? <HelperText>{note}</HelperText> : null}
        <DateSelect3
          month={picker.month}
          day={picker.day}
          year={picker.year}
          onChange={setPicker}
        />
        {isPast ? <WarningText>You can only create days for today or later.</WarningText> : null}
        <Button disabled={disabled || isPast} onClick={() => onDayAdded(picker)}>
          {buttonLabel}
        </Button>
      </SectionCard>
    </AnalyticsScope>
  );
}
