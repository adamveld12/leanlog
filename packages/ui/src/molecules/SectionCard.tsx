import type { PropsWithChildren } from 'react';
import { Card } from '../atoms/Card';
import { Text } from '../atoms/Text';
import { AnalyticsScope } from '../analytics';

type SectionCardProps = PropsWithChildren<{ title?: string; saved?: boolean }>;

export function SectionCard({ title, saved, children }: SectionCardProps) {
  return (
    <AnalyticsScope properties={{ molecule: 'SectionCard', section: title }}>
      <Card saved={saved}>
        {title ? (
          <Text as="h3" variant="sectionHeading">
            {title}
          </Text>
        ) : null}
        {children}
      </Card>
    </AnalyticsScope>
  );
}
