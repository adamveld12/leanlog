import type { ReactNode } from 'react';

type AuthLandingProps = {
  appName: string;
  iconSrc: string;
  cta: ReactNode;
  subtitle?: string;
  highlights?: string[];
};

export function AuthLanding({
  appName,
  iconSrc,
  cta,
  subtitle = 'Track meals, macros, and calories with a focused daily workflow.',
  highlights = ['One-tap day setup', 'Fast macro logging', 'Clean daily progress tracking'],
}: AuthLandingProps) {
  return (
    <main className="ll-page ll-main">
      <section className="ll-auth-wrap">
        <div className="ll-auth-shell">
          <div className="ll-auth-core">
            <span className="ll-auth-badge">Simple macro tracker</span>
            <h1 className="ll-page-title ll-auth-title">
              <img src={iconSrc} alt="" aria-hidden className="ll-auth-icon" />
              {appName}
            </h1>
            <p className="ll-page-subtitle">{subtitle}</p>
            <ul className="ll-auth-highlights" aria-label="Product highlights">
              {highlights.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <div className="ll-auth-cta">{cta}</div>
          </div>
        </div>
      </section>
    </main>
  );
}
