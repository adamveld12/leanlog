import type { ComponentProps, ReactNode } from 'react';
import { PageNavHeading } from '../organisms/PageNavHeading';
import { AppShell } from './AppShell';

export type SimpleStatsTemplateProps = {
  heading: ComponentProps<typeof PageNavHeading>;
  weekSection: ReactNode;
};

// Simple mode's read-only look back at the last 7 days (#102).
export function SimpleStatsTemplate({ heading, weekSection }: SimpleStatsTemplateProps) {
  return (
    <AppShell>
      <PageNavHeading {...heading} />
      {weekSection}
    </AppShell>
  );
}
