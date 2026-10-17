import type { ComponentProps, ReactNode } from 'react';
import { PageNavHeading } from '../organisms/PageNavHeading';
import { AppShell } from './AppShell';

export type SimpleEntryTemplateProps = {
  heading: ComponentProps<typeof PageNavHeading>;
  weightSection: ReactNode;
  totalsSection: ReactNode;
  /** The four fixed meal sections, in order. */
  sections: ReactNode;
  /** Anything page-level that isn't laid out inline, e.g. the add-food modal. */
  children?: ReactNode;
};

// Simple mode's single entry page (#102): today's weight, today's totals, then
// Breakfast / Lunch / Dinner / Snacks — one column, like a notebook page.
export function SimpleEntryTemplate({
  heading,
  weightSection,
  totalsSection,
  sections,
  children,
}: SimpleEntryTemplateProps) {
  return (
    <AppShell>
      <PageNavHeading {...heading} />
      {weightSection}
      {totalsSection}
      {sections}
      {children}
    </AppShell>
  );
}
