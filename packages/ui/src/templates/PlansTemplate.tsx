import type { ComponentProps, ReactNode } from 'react';
import { PageNavHeading } from '../organisms/PageNavHeading';
import { AppShell } from './AppShell';

export type PlansTemplateProps = {
  heading: ComponentProps<typeof PageNavHeading>;
  /** The user's plan list (reorderable) with its surrounding card. */
  listSection: ReactNode;
  /** The "add a plan" card. */
  addSection: ReactNode;
  children?: ReactNode;
};

export function PlansTemplate({ heading, listSection, addSection, children }: PlansTemplateProps) {
  return (
    <AppShell>
      <PageNavHeading {...heading} />
      {listSection}
      {addSection}
      {children}
    </AppShell>
  );
}
