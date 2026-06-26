import type { ComponentProps, ReactNode } from 'react';
import { PageNavHeading } from '../organisms/PageNavHeading';
import { AppShell } from './AppShell';

export type DayListTemplateProps = {
  heading: ComponentProps<typeof PageNavHeading>;
  quickActions: ReactNode;
  statistics: ReactNode;
  weightTrend?: ReactNode;
  /** V-taper + waist measurement trends (#68). */
  measurementTrend?: ReactNode;
  /** The month calendar, which also creates today/future days on tap (#41). */
  calendar: ReactNode;
  /** Optional entry point to the meal template editor (issue #41). */
  templatesLink?: ReactNode;
  footer?: ReactNode;
};

export function DayListTemplate({
  heading,
  quickActions,
  statistics,
  weightTrend,
  measurementTrend,
  calendar,
  templatesLink,
  footer,
}: DayListTemplateProps) {
  return (
    <AppShell>
      <PageNavHeading {...heading} />
      {quickActions}
      {statistics}
      {weightTrend}
      {measurementTrend}
      {calendar}
      {templatesLink}
      {footer}
    </AppShell>
  );
}
