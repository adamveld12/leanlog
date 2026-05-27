import type { Meta, StoryObj } from '@storybook/react';
import { MonthCalendarCard, type CalendarDay } from './MonthCalendarCard';

const meta: Meta<typeof MonthCalendarCard> = {
  title: 'Design System/Organisms/MonthCalendarCard',
  component: MonthCalendarCard,
};

export default meta;
type Story = StoryObj<typeof MonthCalendarCard>;

function buildMay2026Days(trackedDates: Set<number>): CalendarDay[] {
  const days: CalendarDay[] = [];
  // May 2026 starts on Friday. ISO week starts Monday.
  // Padding: May 1 is Friday -> 4 blank cells (Mon-Thu)
  for (let pad = 0; pad < 4; pad++) {
    days.push({
      date: `2026-04-${27 + pad}`,
      dayOfMonth: 27 + pad,
      isToday: false,
      isFuture: false,
      status: 'future',
    });
  }

  const today = 27;
  for (let d = 1; d <= 31; d++) {
    const isFuture = d > today;
    const isToday = d === today;
    const tracked = trackedDates.has(d);
    days.push({
      date: `2026-05-${String(d).padStart(2, '0')}`,
      dayOfMonth: d,
      isToday,
      isFuture,
      status: isFuture ? 'future' : tracked ? 'tracked' : 'missed',
      onTap: tracked ? () => {} : undefined,
    });
  }
  return days;
}

export const MidMonth: Story = {
  args: {
    title: 'May 2026',
    days: buildMay2026Days(new Set([21, 22, 23, 24, 25, 26, 27])),
  },
};

export const StartOfMonth: Story = {
  args: {
    title: 'May 2026',
    days: buildMay2026Days(new Set([1, 2, 3])),
  },
};

export const ZeroDays: Story = {
  args: {
    title: 'May 2026',
    days: buildMay2026Days(new Set()),
    emptyHint: 'Start logging to fill in your calendar!',
  },
};
