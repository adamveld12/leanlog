import type { ComponentProps, ReactNode } from 'react';
import { PageNavHeading } from '../organisms/PageNavHeading';
import { AppShell } from './AppShell';

export type DayListTemplateProps = {
  heading: ComponentProps<typeof PageNavHeading>;
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
  quickActions,
  statistics,
  calendar,
  templatesLink,
  footer,
}: DayListTemplateProps) {
  return (
    <AppShell>
      <PageNavHeading {...heading} />
      {quickActions}
      {statistics}
      {calendar}
      {templatesLink}
      {footer}
    </AppShell>
  );
}
