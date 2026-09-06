import type { ComponentProps, ReactNode } from 'react';
import { PageNavHeading } from '../organisms/PageNavHeading';
import { AppShell } from './AppShell';

export type PlanEditTemplateProps = {
  heading: ComponentProps<typeof PageNavHeading>;
  /** The editable plan-name card, plus duplicate/apply actions. */
  nameSection: ReactNode;
  /** The plan's whole-day totals against the user's real targets (#84 R11-R14). */
  totalsSection: ReactNode;
  /** The reorderable list of meals with their per-meal totals. */
  mealsSection: ReactNode;
  /** Optional delete-plan card. Page-level actions may instead live in the name card. */
  dangerZone?: ReactNode;
  children?: ReactNode;
};

export function PlanEditTemplate({
  heading,
  nameSection,
  totalsSection,
  mealsSection,
  dangerZone,
  children,
}: PlanEditTemplateProps) {
  return (
    <AppShell>
      <PageNavHeading {...heading} />
      {nameSection}
      {totalsSection}
      {mealsSection}
      {dangerZone}
      {children}
    </AppShell>
  );
}
