import type { ReactNode } from 'react';
import { PageNavHeading, type PageNavHeadingProps } from '../organisms/PageNavHeading';
import { AppShell } from './AppShell';

export type ProfileTemplateProps = {
  heading: PageNavHeadingProps;
  children: ReactNode;
};

export function ProfileTemplate({ heading, children }: ProfileTemplateProps) {
  return (
    <AppShell>
      <PageNavHeading {...heading} />
      {children}
    </AppShell>
  );
}
