import { useState } from 'react';
import { Button } from './Button';
import { DateSelect3 } from './DateSelect3';
import { SectionCard } from './SectionCard';

export type DayPickerValue = {
  month: number;
  day: number;
  year: number;
};

export type AddDayControlProps = {
  onDayAdded: (next: DayPickerValue) => void;
  month?: number;
  day?: number;
  year?: number;
  title?: string;
  note?: string;
  buttonLabel?: string;
  disabled?: boolean;
};

export function AddDayControl({
  onDayAdded,
  month,
  day,
  year,
  title = 'Add day',
  note = 'Choose month, day, and year to create a new log day.',
  buttonLabel = 'Add day',
  disabled = false,
}: AddDayControlProps) {
  const [picker, setPicker] = useState<DayPickerValue>(() => {
    const now = new Date();
    return {
      month: month ?? now.getMonth() + 1,
      day: day ?? now.getDate(),
      year: year ?? now.getFullYear(),
    };
  });

  return (
    <SectionCard title={title}>
      {note ? <p className="ll-section-note">{note}</p> : null}
      <DateSelect3 month={picker.month} day={picker.day} year={picker.year} onChange={setPicker} />
      <Button disabled={disabled} onClick={() => onDayAdded(picker)}>
        {buttonLabel}
      </Button>
    </SectionCard>
  );
}
