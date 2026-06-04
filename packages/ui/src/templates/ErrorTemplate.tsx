import type { ReactNode } from 'react';
import { AnalyticsScope } from '../analytics';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Text } from '../atoms/Text';
import { cn } from '../styles/cn';
import { recipes } from '../styles/recipes';
import { AppShell } from './AppShell';

export type ErrorTemplateProps = {
  title: string;
  message: string;
  homeHref?: string;
  homeLabel?: string;
  retryLabel?: string;
  onRetry?: () => void;
  details?: ReactNode;
};

export function ErrorTemplate({
  title,
  message,
  homeHref = '/',
  homeLabel = 'Go home',
  retryLabel,
  onRetry,
  details,
}: ErrorTemplateProps) {
  return (
    <AnalyticsScope properties={{ template: 'ErrorTemplate' }}>
      <AppShell className="justify-center pb-4">
        <Card>
          <div className={cn(recipes.stack.lg, 'py-4')}>
            <div role="alert" className={recipes.stack.sm}>
              <Text as="h1" variant="title">
                {title}
              </Text>
              <Text as="p">{message}</Text>
            </div>
            {details ? <div>{details}</div> : null}
            <div className={cn(recipes.stack.actions, 'justify-start')}>
              <Button as="a" href={homeHref} variant="secondary">
                {homeLabel}
              </Button>
              {retryLabel && onRetry ? <Button onClick={onRetry}>{retryLabel}</Button> : null}
            </div>
          </div>
        </Card>
      </AppShell>
    </AnalyticsScope>
  );
}
