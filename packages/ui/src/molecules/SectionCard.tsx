import type { PropsWithChildren } from 'react';
import { Card } from '../atoms/Card';
import { SectionHeading } from '../atoms/SectionHeading';
import { AnalyticsScope } from '../analytics';

type SectionCardProps = PropsWithChildren<{ title?: string; saved?: boolean }>;

export function SectionCard({ title, saved, children }: SectionCardProps) {
  return (
    <AnalyticsScope properties={{ molecule: 'SectionCard', section: title }}>
      <Card saved={saved}>
        {title ? <SectionHeading>{title}</SectionHeading> : null}
        {children}
      </Card>
    </AnalyticsScope>
  );
}
