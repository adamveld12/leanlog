import type { ComponentProps, ReactNode } from 'react';
import { PageNavHeading } from '../organisms/PageNavHeading';
import { AppShell } from './AppShell';

export type MealTemplateEditTemplateProps = {
  heading: ComponentProps<typeof PageNavHeading>;
  /** The editable template-name card. */
  nameSection: ReactNode;
  /** The default-ingredients card (manual / scan / database entry). */
  ingredientsSection: ReactNode;
  /** The delete-template card. */
  dangerZone: ReactNode;
  children?: ReactNode;
};

export function MealTemplateEditTemplate({
  heading,
  nameSection,
  ingredientsSection,
  dangerZone,
  children,
}: MealTemplateEditTemplateProps) {
  return (
    <AppShell>
      <PageNavHeading {...heading} />
      {nameSection}
      {ingredientsSection}
      {dangerZone}
      {children}
    </AppShell>
  );
}
