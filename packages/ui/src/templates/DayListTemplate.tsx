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
  footer?: ReactNode;
};

export function DayListTemplate({
  heading,
  quickActions,
  statistics,
  weightTrend,
  calendar,
  addDay,
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
      {footer}
    </AppShell>
  );
}
