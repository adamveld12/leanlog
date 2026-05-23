import { useState } from 'react';
import { Button } from '../atoms/Button';
import { DateSelect3 } from '../molecules/DateSelect3';
import { Input } from '../atoms/Input';
import { SectionCard } from '../molecules/SectionCard';

export type AddDayValue = {
  month: number;
  day: number;
  year: number;
  totalMeals: number;
};

type DayPickerValue = Pick<AddDayValue, 'month' | 'day' | 'year'>;

export type AddDayControlProps = {
  onDayAdded: (next: AddDayValue) => void;
  month?: number;
  day?: number;
  year?: number;
  totalMeals?: number;
  hideTotalMealsInput?: boolean;
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
  totalMeals = 4,
  hideTotalMealsInput = false,
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
  const [totalMealsValue, setTotalMealsValue] = useState<number>(totalMeals);

  return (
    <SectionCard title={title}>
      {note ? <p className="text-xs font-medium text-[var(--ll-text-muted)]">{note}</p> : null}
      <DateSelect3 month={picker.month} day={picker.day} year={picker.year} onChange={setPicker} />
      {hideTotalMealsInput ? null : (
        <div>
          <p className="text-xs font-medium text-[var(--ll-text-muted)]">Total meals for the day</p>
          <Input
            type="number"
            min={0}
            step={1}
            value={String(totalMealsValue)}
            onChange={(e) => {
              const parsed = Number.parseInt(e.target.value, 10);
              setTotalMealsValue(Number.isNaN(parsed) ? 0 : Math.max(0, parsed));
            }}
          />
        </div>
      )}
      <Button
        disabled={disabled}
        onClick={() => onDayAdded({ ...picker, totalMeals: totalMealsValue })}
      >
        {buttonLabel}
      </Button>
    </SectionCard>
  );
}
