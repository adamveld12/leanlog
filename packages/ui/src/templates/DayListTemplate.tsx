import type { ComponentProps, ReactNode } from 'react';
import { AddDayControl } from '../organisms/AddDayControl';
import { PageNavHeading } from '../organisms/PageNavHeading';
import { AppShell } from './AppShell';

export type DayListTemplateProps = {
  heading: ComponentProps<typeof PageNavHeading>;
  quickActions: ReactNode;
  statistics: ReactNode;
  weightTrend?: ReactNode;
  calendar: ReactNode;
  addDay: ComponentProps<typeof AddDayControl>;
  /** Optional entry point to the meal template editor (issue #41). */
  templatesLink?: ReactNode;
  footer?: ReactNode;
};

export function DayListTemplate({
  heading,
  quickActions,
  statistics,
  weightTrend,
  calendar,
  addDay,
  templatesLink,
  footer,
}: DayListTemplateProps) {
  return (
    <AppShell>
      <PageNavHeading {...heading} />
      {quickActions}
      {statistics}
      {weightTrend}
      {calendar}
      <AddDayControl {...addDay} />
      {templatesLink}
      {footer}
    </AppShell>
  );
}
