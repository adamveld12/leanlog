import type { ComponentProps, ReactNode } from 'react';
import { PageNavHeading } from '../organisms/PageNavHeading';
import { AppShell } from './AppShell';

// The Stats page: progress trend charts (weight + measurements) split out of the
// Execute page into their own destination (#68).
export type StatsTemplateProps = {
  heading: ComponentProps<typeof PageNavHeading>;
  weightTrend: ReactNode;
  measurementTrend: ReactNode;
};

export function StatsTemplate({ heading, weightTrend, measurementTrend }: StatsTemplateProps) {
  return (
    <AppShell>
      <PageNavHeading {...heading} />
      {weightTrend}
      {measurementTrend}
    </AppShell>
  );
}
