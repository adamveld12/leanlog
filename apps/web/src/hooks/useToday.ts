import { useEffect, useState } from 'react';
import { todayIso } from '../lib';

function msUntilNextLocalMidnight(): number {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return midnight.getTime() - now.getTime();
}

// The current local date, kept fresh without a reload (#102): simple mode's
// Entry page only ever shows today, so it must roll over at local midnight —
// via a timer while the page is open, and on refocus after the device slept.
export function useToday(): string {
  const [today, setToday] = useState(todayIso);

  useEffect(() => {
    const refresh = () => setToday(todayIso());
    // A second past midnight so the date has definitely changed.
    const timer = setTimeout(refresh, msUntilNextLocalMidnight() + 1000);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [today]);

  return today;
}
