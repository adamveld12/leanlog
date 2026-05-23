import type { PropsWithChildren } from 'react';

export type AnalyticsValue = string | number | boolean | null | undefined;
export type AnalyticsProperties = Record<string, AnalyticsValue>;
export type TrackUiEvent = (eventName: string, properties?: AnalyticsProperties) => void;
export type AnalyticsProviderProps = PropsWithChildren<{ track?: TrackUiEvent }>;
