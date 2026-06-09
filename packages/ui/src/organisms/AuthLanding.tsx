import type { ReactNode } from 'react';
import { AnalyticsScope } from '../analytics';
import { Card } from '../atoms/Card';
import { PageTitle } from '../atoms/PageTitle';
import { SectionHeading } from '../atoms/SectionHeading';
import { Text } from '../atoms/Text';
import { cn } from '../styles/cn';
import { recipes } from '../styles/recipes';

export type AuthLandingProps = {
  appName?: string;
  iconSrc?: string;
  subtitle?: string;
  cta: ReactNode;
  pricing?: ReactNode;
  highlights?: string[];
};

export function AuthLanding({
  appName = 'LeanLog',
  iconSrc = '/icon-192.png',
  subtitle = 'A quiet, fast nutrition tracker for meals, calories, and macros.',
  cta,
  pricing,
  highlights = ['Log meals quickly', 'Track calories and macros', 'Keep your data portable'],
}: AuthLandingProps) {
  return (
    <AnalyticsScope properties={{ organism: 'AuthLanding' }}>
      <main
        className={cn(recipes.page.shell, recipes.page.main, 'min-h-[100dvh] justify-center pb-8')}
      >
        <Card className={cn(recipes.stack.lg, 'p-4 md:p-5')}>
          <div className={recipes.stack.rowMd}>
            <img
              src={iconSrc}
              alt=""
              aria-hidden
              className={cn(recipes.radius.control, 'h-10 w-10 border border-[var(--ll-line)]')}
            />
            <PageTitle hero>{appName}</PageTitle>
          </div>
          <Text as="p" variant="pageSubtitle" className="leading-6">
            {subtitle}
          </Text>
          <div className="pt-2">{cta}</div>
        </Card>
        <Card className={cn(recipes.stack.sm, 'p-4 md:p-5')}>
          <Text as="h2" variant="subheading">
            What is lean log?
          </Text>
          <SectionHeading as="h3" noMargin>
            What you get
          </SectionHeading>
          <ul className={cn(recipes.stack.sm, 'm-0 list-none p-0')} aria-label="Product highlights">
            {highlights.map((highlight) => (
              <li key={highlight} className={cn(recipes.stack.row, recipes.listItem)}>
                <Text as="span" variant="body">
                  {highlight}
                </Text>
              </li>
            ))}
          </ul>
        </Card>
        {pricing ? (
          <Card className={cn(recipes.stack.sm, 'p-4 md:p-5')}>
            <SectionHeading as="h2" noMargin>
              Pricing
            </SectionHeading>
            {pricing}
          </Card>
        ) : null}
      </main>
    </AnalyticsScope>
  );
}
