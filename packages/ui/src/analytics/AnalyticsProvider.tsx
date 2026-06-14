import { createContext, use, useMemo } from 'react';
import type { AnalyticsProperties, AnalyticsProviderProps, TrackUiEvent } from './types';

type AnalyticsContextValue = { scope: AnalyticsProperties; track: TrackUiEvent };
const noop: TrackUiEvent = () => undefined;
export const AnalyticsContext = createContext<AnalyticsContextValue>({ scope: {}, track: noop });

export function AnalyticsProvider({ track = noop, children }: AnalyticsProviderProps) {
  const value = useMemo(() => ({ scope: {}, track }), [track]);
  return <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>;
}

export function useAnalytics() {
  const context = use(AnalyticsContext);
  return (eventName: string, properties: AnalyticsProperties = {}) =>
    context.track(eventName, { ...context.scope, ...properties });
}
