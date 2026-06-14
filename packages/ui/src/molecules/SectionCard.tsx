import type { PropsWithChildren } from 'react';
import { Card } from '../atoms/Card';
import { SectionHeading } from '../atoms/SectionHeading';
import { AnalyticsScope } from '../analytics/AnalyticsScope';
import { recipes } from '../styles/recipes';

type SectionCardProps = PropsWithChildren<{ title?: string; saved?: boolean }>;

export function SectionCard({ title, saved, children }: SectionCardProps) {
  return (
    <AnalyticsScope properties={{ molecule: 'SectionCard', section: title }}>
      <Card saved={saved}>
        <div className={recipes.stack.sm}>
          {title ? <SectionHeading noMargin>{title}</SectionHeading> : null}
          {children}
        </div>
      </Card>
    </AnalyticsScope>
  );
}
