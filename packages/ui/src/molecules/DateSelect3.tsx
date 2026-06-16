import { Select } from '../atoms/Select';
import { recipes } from '../styles/recipes';

type DateSelect3Props = {
  month: number;
  day: number;
  year: number;
  onChange: (next: { month: number; day: number; year: number }) => void;
};

export function DateSelect3({ month, day, year, onChange }: DateSelect3Props) {
  // Offer a few future years so users can pre-log upcoming days, plus history.
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 22 }, (_, i) => currentYear + 2 - i);
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  return (
    <div className={recipes.grid.three}>
      <Select
        name="month"
        value={month}
        onChange={(e) => onChange({ month: Number(e.target.value), day, year })}
      >
        {months.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </Select>
      <Select
        name="day"
        value={day}
        onChange={(e) => onChange({ month, day: Number(e.target.value), year })}
      >
        {days.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </Select>
      <Select
        name="year"
        value={year}
        onChange={(e) => onChange({ month, day, year: Number(e.target.value) })}
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </Select>
    </div>
  );
}
