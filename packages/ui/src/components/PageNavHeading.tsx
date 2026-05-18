import type { ReactNode } from 'react';

type NavLinkRenderProps = {
  href: string;
  label: string;
  className: string;
};

export type PageNavHeadingProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  backHref?: string;
  profileHref: string;
  backLabel?: string;
  profileLabel?: string;
  renderNavLink?: (props: NavLinkRenderProps) => ReactNode;
};

export function PageNavHeading({
  title,
  subtitle,
  backHref,
  profileHref,
  backLabel = '← Back',
  profileLabel = 'Profile',
  renderNavLink,
}: PageNavHeadingProps) {
  const linkClassName = 'll-btn ll-btn-sm ll-btn-subtle';
  const renderLink = ({ href, label }: { href: string; label: string }) => {
    if (renderNavLink) {
      return renderNavLink({ href, label, className: linkClassName });
    }

    return (
      <a className={linkClassName} href={href}>
        {label}
      </a>
    );
  };

  return (
    <div className="ll-stack">
      <div className="relative w-full">
        <div className="ll-row min-w-0 pr-24">
          {backHref ? renderLink({ href: backHref, label: backLabel }) : null}
          <h1 className="ll-page-title">{title}</h1>
        </div>
        {subtitle ? (
          <div className="pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 md:block">
            {subtitle}
          </div>
        ) : null}
        <div className="absolute right-0 top-1/2 -translate-y-1/2">
          {renderLink({ href: profileHref, label: profileLabel })}
        </div>
      </div>
      {subtitle ? <div className="md:hidden">{subtitle}</div> : null}
    </div>
  );
}
