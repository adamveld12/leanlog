import type { ComponentProps, ReactNode } from 'react';
import { ListSectionCard } from '../organisms/ListSectionCard';
import { PageNavHeading } from '../organisms/PageNavHeading';
import { AppShell } from './AppShell';

export type DayDetailTemplateProps = {
  heading: ComponentProps<typeof PageNavHeading>;
  weightSection?: ReactNode;
  /** Progress-photo capture for the current day (#69); omitted on past days. */
  photosSection?: ReactNode;
  totalsSection: ReactNode;
  mealsTitle: string;
  mealsItems: ComponentProps<typeof ListSectionCard>['items'];
  mealsEmptyText?: string;
  mealsControls?: ReactNode;
  children?: ReactNode;
};

export function DayDetailTemplate({
  heading,
  weightSection,
  photosSection,
  totalsSection,
  mealsTitle,
  mealsItems,
  mealsEmptyText = 'No meals yet',
  mealsControls,
  children,
}: DayDetailTemplateProps) {
  return (
    <AppShell>
      <PageNavHeading {...heading} />
      {weightSection}
      {photosSection}
      {totalsSection}
      <ListSectionCard title={mealsTitle} items={mealsItems} emptyText={mealsEmptyText} childrenTop>
        {mealsControls}
      </ListSectionCard>
      {children}
    </AppShell>
  );
}
