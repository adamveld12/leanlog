import { useState } from 'react';
import { AnalyticsScope } from '../analytics/AnalyticsScope';
import { Button } from '../atoms/Button';
import { HelperText } from '../atoms/HelperText';
import { IntegerInput } from '../atoms/IntegerInput';
import { DateSelect3 } from '../molecules/DateSelect3';
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
    <AnalyticsScope properties={{ organism: 'AddDayControl' }}>
      <SectionCard title={title}>
        {note ? <HelperText>{note}</HelperText> : null}
        <DateSelect3
          month={picker.month}
          day={picker.day}
          year={picker.year}
          onChange={setPicker}
        />
        {hideTotalMealsInput ? null : (
          <div>
            <HelperText>Total meals for the day</HelperText>
            <IntegerInput min={0} step={1} value={totalMealsValue} onChange={setTotalMealsValue} />
          </div>
        )}
        <Button
          disabled={disabled}
          onClick={() => onDayAdded({ ...picker, totalMeals: totalMealsValue })}
        >
          {buttonLabel}
        </Button>
      </SectionCard>
    </AnalyticsScope>
  );
}
