import type { ComponentProps, ReactNode } from 'react';
import { PageNavHeading } from '../organisms/PageNavHeading';
import { AppShell } from './AppShell';

export type NutritionFactsDatabaseTemplateProps = {
  heading: ComponentProps<typeof PageNavHeading>;
  /** The catalog browse/search card plus any inline create/edit form. */
  children: ReactNode;
};

// The dedicated Nutrition Facts Database management page shell (#49). Mirrors the
// other page templates: a nav heading over a single content column.
export function NutritionFactsDatabaseTemplate({
  heading,
  children,
}: NutritionFactsDatabaseTemplateProps) {
  return (
    <AppShell>
      <PageNavHeading {...heading} />
      {children}
    </AppShell>
  );
}
