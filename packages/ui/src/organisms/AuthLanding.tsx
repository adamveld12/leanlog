import type { ReactNode } from 'react';
import { Card } from '../atoms/Card';
import { PageTitle } from '../atoms/PageTitle';
import { Text } from '../atoms/Text';
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
    <main
      className={`${recipes.page.shell} ${recipes.page.main} min-h-[100dvh] justify-center pb-8`}
    >
      <Card className="flex flex-col gap-4 p-4 md:p-5">
        <div className="flex items-center gap-3">
          <img
            src={iconSrc}
            alt=""
            aria-hidden
            className="h-10 w-10 rounded-[10px] border border-[var(--ll-line)]"
          />
          <PageTitle hero>{appName}</PageTitle>
        </div>
        <Text as="p" variant="pageSubtitle" className="leading-6">
          {subtitle}
        </Text>
        <div className="pt-2 [&_.inline-flex]:w-full md:[&_.inline-flex]:w-auto">{cta}</div>
      </Card>
      <Card className="flex flex-col gap-2.5 p-4 md:p-5" aria-label="Product highlights">
        <Text as="h2" className="text-base font-semibold normal-case tracking-tight text-[var(--ll-text)]">
          What is lean log?
        </Text>
        <Text as="p" variant="sectionHeading">
          What you get
        </Text>
        <ul className="m-0 flex list-none flex-col gap-2.5 p-0" aria-label="Product highlights">
          {highlights.map((highlight) => (
            <li
              key={highlight}
              className="flex items-center gap-2 rounded-[10px] border border-[var(--ll-line)] px-3 py-2 text-sm font-medium before:block before:h-1.5 before:w-1.5 before:rounded-[999px] before:bg-[var(--ll-text-muted)]"
            >
              {highlight}
            </li>
          ))}
        </ul>
      </Card>
      {pricing ? (
        <Card className="flex flex-col gap-2.5 p-4 md:p-5">
          <Text as="h2" variant="sectionHeading">
            Pricing
          </Text>
          {pricing}
        </Card>
      ) : null}
    </main>
  );
}
