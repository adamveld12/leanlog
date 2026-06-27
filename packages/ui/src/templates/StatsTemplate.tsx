import type { ComponentProps, ReactNode } from 'react';
import { PageNavHeading } from '../organisms/PageNavHeading';
import { AppShell } from './AppShell';

// The Stats page: progress trend charts (weight + measurements) split out of the
// Execute page into their own destination (#68).
export type StatsTemplateProps = {
  heading: ComponentProps<typeof PageNavHeading>;
  weightTrend: ReactNode;
  measurementTrend: ReactNode;
  /** Bicep + quad circumference trends, charted separately from the v-taper group (#68). */
  limbTrend: ReactNode;
};

export function StatsTemplate({
  heading,
  weightTrend,
  measurementTrend,
  limbTrend,
}: StatsTemplateProps) {
  return (
    <AppShell>
      <PageNavHeading {...heading} />
      {weightTrend}
      {measurementTrend}
      {limbTrend}
    </AppShell>
  );
}
