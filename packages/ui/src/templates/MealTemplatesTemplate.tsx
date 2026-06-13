import type { ComponentProps, ReactNode } from 'react';
import { PageNavHeading } from '../organisms/PageNavHeading';
import { AppShell } from './AppShell';

export type MealTemplatesTemplateProps = {
  heading: ComponentProps<typeof PageNavHeading>;
  /** The user's template list (reorderable) with its surrounding card. */
  listSection: ReactNode;
  /** The "add a template" card. */
  addSection: ReactNode;
  children?: ReactNode;
};

export function MealTemplatesTemplate({
  heading,
  listSection,
  addSection,
  children,
}: MealTemplatesTemplateProps) {
  return (
    <AppShell>
      <PageNavHeading {...heading} />
      {listSection}
      {addSection}
      {children}
    </AppShell>
  );
}
