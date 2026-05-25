import { useContext, useMemo, type PropsWithChildren } from 'react';
import { AnalyticsContext } from './AnalyticsProvider';
import type { AnalyticsProperties } from './types';

export function AnalyticsScope({
  properties,
  children,
}: PropsWithChildren<{ properties: AnalyticsProperties }>) {
  const parent = useContext(AnalyticsContext);
  const value = useMemo(
    () => ({ ...parent, scope: { ...parent.scope, ...properties } }),
    [parent, properties],
  );
  return <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>;
}
