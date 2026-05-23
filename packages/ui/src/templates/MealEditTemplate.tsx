import type { ComponentProps, ReactNode } from 'react';
import { IngredientEntryCard } from '../organisms/IngredientEntryCard';
import { ListSectionCard } from '../organisms/ListSectionCard';
import { PageNavHeading } from '../organisms/PageNavHeading';
import { AppShell } from './AppShell';

export type MealEditTemplateProps = {
  heading: ComponentProps<typeof PageNavHeading>;
  ingredients: ComponentProps<typeof ListSectionCard>;
  ingredientEntry: ComponentProps<typeof IngredientEntryCard>;
  children?: ReactNode;
};

export function MealEditTemplate({
  heading,
  ingredients,
  ingredientEntry,
  children,
}: MealEditTemplateProps) {
  return (
    <AppShell>
      <PageNavHeading {...heading} />
      <ListSectionCard {...ingredients} />
      <IngredientEntryCard {...ingredientEntry} />
      {children}
    </AppShell>
  );
}
