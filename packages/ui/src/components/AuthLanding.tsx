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
  highlights = ['One-tap day setup', 'Fast macro logging', 'Clean daily progress tracking'],
  pricing,
}: AuthLandingProps) {
  return (
    <main className="ll-page ll-main ll-auth-page">
      <section className="ll-auth-grid">
        <div className="ll-auth-column-main">
          <span className="ll-auth-badge">Simple macro tracker</span>
          <h1 className="ll-auth-hero-title">
            <img src={iconSrc} alt="" aria-hidden className="ll-auth-icon" />
            {appName}
          </h1>
          <p className="ll-auth-subtitle">{subtitle}</p>
          <div className="ll-auth-cta">{cta}</div>
        </div>

        <aside className="ll-auth-column-side" aria-label="Product highlights">
          <h2 className="ll-auth-side-title">What you get</h2>
          <ul className="ll-auth-highlights" aria-label="Product highlights">
            {highlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </aside>
      </section>
      {pricing ? (
        <section className="ll-auth-pricing">
          <h2 className="ll-auth-side-title">Pricing</h2>
          {pricing}
        </section>
      ) : null}
    </main>
  );
}
