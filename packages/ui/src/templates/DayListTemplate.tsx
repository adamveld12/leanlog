import type { ComponentProps, ReactNode } from 'react';
import { PageNavHeading } from '../organisms/PageNavHeading';
import { AppShell } from './AppShell';

export type DayListTemplateProps = {
  heading: ComponentProps<typeof PageNavHeading>;
  /** Today's objectives command center (#37); leads the page when present. */
  objectives?: ReactNode;
  quickActions: ReactNode;
  statistics: ReactNode;
  /** The month calendar, which also creates today/future days on tap (#41). */
  calendar: ReactNode;
  /** Optional entry point to the meal template editor (issue #41). */
  templatesLink?: ReactNode;
  footer?: ReactNode;
};

export function DayListTemplate({
  heading,
  objectives,
  quickActions,
  statistics,
  calendar,
  templatesLink,
  footer,
}: DayListTemplateProps) {
  return (
    <AppShell>
      <PageNavHeading {...heading} />
      {objectives}
      {quickActions}
      {statistics}
      {calendar}
      {templatesLink}
      {footer}
    </AppShell>
  );
}
