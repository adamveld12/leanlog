import type { ComponentProps, ReactNode } from 'react';
import { Button } from '../atoms/Button';
import { MacroSummaryLine } from '../molecules/MacroSummaryLine';
import { SectionCard } from '../molecules/SectionCard';
import { ListSectionCard } from '../organisms/ListSectionCard';
import { PageNavHeading } from '../organisms/PageNavHeading';
import { AppShell } from './AppShell';

export type DayDetailTemplateProps = {
  heading: ComponentProps<typeof PageNavHeading>;
  totals: ComponentProps<typeof MacroSummaryLine>;
  meals: ComponentProps<typeof ListSectionCard>['items'];
  onAddMeal: () => void;
  children?: ReactNode;
};

export function DayDetailTemplate({
  heading,
  totals,
  meals,
  onAddMeal,
  children,
}: DayDetailTemplateProps) {
  return (
    <AppShell>
      <PageNavHeading {...heading} />
      <SectionCard title="Daily totals">
        <MacroSummaryLine {...totals} />
      </SectionCard>
      <Button onClick={onAddMeal}>Add meal</Button>
      <ListSectionCard title="Meals" items={meals} emptyText="No meals yet" />
      {children}
    </AppShell>
  );
}
