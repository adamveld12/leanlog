import { AnalyticsProvider } from './AnalyticsProvider';
import type { AnalyticsProviderProps, TrackUiEvent } from './types';

export function ConsoleAnalyticsProvider({
  enabled = true,
  children,
}: AnalyticsProviderProps & { enabled?: boolean }) {
  const track: TrackUiEvent = (eventName, properties) => {
    if (!enabled || typeof window === 'undefined') return;
    console.info('[leanlog analytics]', eventName, properties ?? {});
  };
  return <AnalyticsProvider track={track}>{children}</AnalyticsProvider>;
}
