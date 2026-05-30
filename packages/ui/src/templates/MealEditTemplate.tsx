import type { ComponentProps, ReactNode } from 'react';
import { PageNavHeading } from '../organisms/PageNavHeading';
import { AppShell } from './AppShell';

export type MealEditTemplateProps = {
  heading: ComponentProps<typeof PageNavHeading>;
  mealSection: ReactNode;
  ingredientSection: ReactNode;
  children?: ReactNode;
};

export function MealEditTemplate({
  heading,
  mealSection,
  ingredientSection,
  children,
}: MealEditTemplateProps) {
  return (
    <AppShell>
      <PageNavHeading {...heading} />
      {mealSection}
      {ingredientSection}
      {children}
    </AppShell>
  );
}
