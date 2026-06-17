import type { ComponentProps, ReactNode } from 'react';
import { PageNavHeading } from '../organisms/PageNavHeading';
import { AppShell } from './AppShell';

export type GoalsTemplateProps = {
  heading: ComponentProps<typeof PageNavHeading>;
  /** The goals command center: timeline planner + selected-goal detail / Add Goal. */
  children: ReactNode;
};

// The Goals command center page shell (#56). Mirrors the other page templates: a
// nav heading over a single content column.
export function GoalsTemplate({ heading, children }: GoalsTemplateProps) {
  return (
    <AppShell>
      <PageNavHeading {...heading} />
      {children}
    </AppShell>
  );
}
