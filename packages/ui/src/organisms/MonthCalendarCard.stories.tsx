import type { Meta, StoryObj } from '@storybook/react';
import { MonthCalendarCard } from './MonthCalendarCard';

const meta: Meta<typeof MonthCalendarCard> = {
  title: 'Design System/Organisms/MonthCalendarCard',
  component: MonthCalendarCard,
  args: {
    onSelectDay: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof MonthCalendarCard>;

// Build a tracked-dates map (ISO 'yyyy-MM-dd' -> dayId) for the given month.
function trackedMap(year: number, month: number, days: number[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const d of days) {
    const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    map.set(iso, `day-${iso}`);
  }
  return map;
}

const now = new Date();

export const CurrentMonth: Story = {
  args: {
    // Defaults to the current month, so the "next" arrow is hidden.
    trackedDates: trackedMap(now.getFullYear(), now.getMonth(), [1, 2, 3]),
  },
};

export const PastMonth: Story = {
  args: {
    // A prior month shows both arrows; tracked days are tappable.
    initialMonth: { year: 2026, month: 0 }, // January 2026
    trackedDates: trackedMap(2026, 0, [6, 7, 8, 9, 10, 13, 14, 15]),
  },
};

export const ZeroDays: Story = {
  args: {
    trackedDates: new Map(),
    emptyHint: 'Start logging to fill in your calendar!',
  },
};
