import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MonthCalendarCard } from '../organisms/MonthCalendarCard';

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

describe('MonthCalendarCard', () => {
  afterEach(cleanup);

  it('opens a tracked day on tap', async () => {
    const onSelectDay = vi.fn();
    const today = new Date();
    const map = new Map([[iso(today), 'day-1']]);
    render(
      <MonthCalendarCard trackedDates={map} onSelectDay={onSelectDay} onCreateDay={() => {}} />,
    );

    await userEvent.click(
      screen.getByRole('button', { name: `${today.getDate()}, today, tracked` }),
    );
    expect(onSelectDay).toHaveBeenCalledWith('day-1');
  });

  it('creates today when tapped and untracked', async () => {
    const onCreateDay = vi.fn();
    const today = new Date();
    render(
      <MonthCalendarCard
        trackedDates={new Map()}
        onSelectDay={() => {}}
        onCreateDay={onCreateDay}
      />,
    );

    await userEvent.click(
      screen.getByRole('button', { name: `${today.getDate()}, today, tap to log` }),
    );
    expect(onCreateDay).toHaveBeenCalledWith(iso(today));
  });

  it('leaves today disabled when no create handler is supplied', () => {
    const today = new Date();
    render(<MonthCalendarCard trackedDates={new Map()} onSelectDay={() => {}} />);
    expect(screen.getByRole('button', { name: `${today.getDate()}, today` })).toBeDisabled();
  });

  it('shows tap-to-create guidance only when creation is enabled', () => {
    const { rerender } = render(
      <MonthCalendarCard trackedDates={new Map()} onSelectDay={() => {}} onCreateDay={() => {}} />,
    );
    expect(
      screen.getByText(
        'Tap a logged day to open it, or tap today or an upcoming day to start logging.',
      ),
    ).toBeInTheDocument();

    rerender(<MonthCalendarCard trackedDates={new Map()} onSelectDay={() => {}} />);
    expect(screen.getByText('Tap a logged day to open it.')).toBeInTheDocument();
  });
});
