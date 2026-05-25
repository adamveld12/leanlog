import type { ComponentProps, ReactNode } from 'react';
import { AddDayControl } from '../organisms/AddDayControl';
import { ListSectionCard } from '../organisms/ListSectionCard';
import { PageNavHeading } from '../organisms/PageNavHeading';
import { AppShell } from './AppShell';

export type DayListTemplateProps = {
  heading: ComponentProps<typeof PageNavHeading>;
  addDay: ComponentProps<typeof AddDayControl>;
  days: ComponentProps<typeof ListSectionCard>['items'];
  footer?: ReactNode;
};

export function DayListTemplate({ heading, addDay, days, footer }: DayListTemplateProps) {
  return (
    <AppShell>
      <PageNavHeading {...heading} />
      <AddDayControl {...addDay} />
      <ListSectionCard title="Days" items={days} emptyText="No days yet" />
      {footer}
    </AppShell>
  );
}
