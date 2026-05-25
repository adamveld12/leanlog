import type { ComponentProps, ReactNode } from 'react';
import { IngredientEntryCard } from '../organisms/IngredientEntryCard';
import { PageNavHeading } from '../organisms/PageNavHeading';
import { AppShell } from './AppShell';

export type MealEditTemplateProps = {
  heading: ComponentProps<typeof PageNavHeading>;
  mealSection: ReactNode;
  ingredientEntry: ComponentProps<typeof IngredientEntryCard>;
  children?: ReactNode;
};

export function MealEditTemplate({
  heading,
  mealSection,
  ingredientEntry,
  children,
}: MealEditTemplateProps) {
  return (
    <AppShell>
      <PageNavHeading {...heading} />
      {mealSection}
      <IngredientEntryCard {...ingredientEntry} />
      {children}
    </AppShell>
  );
}
