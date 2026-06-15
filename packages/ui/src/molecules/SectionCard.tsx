import type { PropsWithChildren } from 'react';
import { Card } from '../atoms/Card';
import { SectionHeading } from '../atoms/SectionHeading';
import { AnalyticsScope } from '../analytics/AnalyticsScope';
import { recipes } from '../styles/recipes';

type SectionCardProps = PropsWithChildren<{ title?: string; saved?: boolean; className?: string }>;

export function SectionCard({ title, saved, className, children }: SectionCardProps) {
  return (
    <AnalyticsScope properties={{ molecule: 'SectionCard', section: title }}>
      <Card saved={saved} className={className}>
        <div className={recipes.stack.sm}>
          {title ? <SectionHeading noMargin>{title}</SectionHeading> : null}
          {children}
        </div>
      </Card>
    </AnalyticsScope>
  );
}
