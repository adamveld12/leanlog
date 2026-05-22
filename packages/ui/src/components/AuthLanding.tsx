import type { ReactNode } from 'react';

type AuthLandingProps = {
  appName: string;
  iconSrc: string;
  cta: ReactNode;
  subtitle?: string;
  highlights?: string[];
  pricing?: ReactNode;
};

export function AuthLanding({
  appName,
  iconSrc,
  cta,
  subtitle = 'Track meals, macros, and calories with a focused daily workflow.',
  highlights = [
    'One-tap day setup',
    'Fast macro logging',
    'Clean daily progress tracking',
    'AI powered nutrition label scanning',
    'Own your data - export in various formats',
  ],
  pricing,
}: AuthLandingProps) {
  return (
    <main className="ll-page ll-main ll-auth-page">
      <section className="ll-card ll-auth-card ll-stack-lg">
        <div className="ll-auth-hero-title-row flex">
          <img src={iconSrc} alt="" aria-hidden className="ll-auth-icon" />
          <h1 className="ll-auth-hero-title">{appName}</h1>
        </div>
        <p className="ll-auth-subtitle">{subtitle}</p>
        <div className="ll-auth-cta">{cta}</div>
      </section>

      <section className="ll-card ll-auth-card ll-stack" aria-label="Product highlights">
        <h2 className="ll-auth-question">What is lean log?</h2>
        <p className="ll-auth-side-title">What you get</p>
        <ul className="ll-auth-highlights" aria-label="Product highlights">
          {highlights.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      {pricing ? (
        <section className="ll-card ll-auth-card ll-stack">
          <h2 className="ll-auth-side-title">Pricing</h2>
          {pricing}
        </section>
      ) : null}
    </main>
  );
}
