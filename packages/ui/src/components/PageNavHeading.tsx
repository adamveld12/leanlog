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
      <div className="relative flex w-full items-center justify-between gap-2">
        <div className="ll-row min-w-0">
          {backHref ? renderLink({ href: backHref, label: backLabel }) : null}
          <h1 className="ll-page-title">{title}</h1>
        </div>
        {subtitle ? (
          <div className="pointer-events-none absolute left-1/2 hidden -translate-x-1/2 md:block">
            {subtitle}
          </div>
        ) : null}
        <div className="ml-auto shrink-0">
          {renderLink({ href: profileHref, label: profileLabel })}
        </div>
      </div>
      {subtitle ? <div className="md:hidden">{subtitle}</div> : null}
    </div>
  );
}
