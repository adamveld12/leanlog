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
      <div className="grid grid-cols-[1fr_auto] items-center gap-2 md:grid-cols-[1fr_auto_1fr]">
        <div className="ll-row min-w-0">
          {backHref ? renderLink({ href: backHref, label: backLabel }) : null}
          <h1 className="ll-page-title">{title}</h1>
        </div>
        {subtitle ? <div className="hidden md:flex md:justify-center">{subtitle}</div> : null}
        <div className="justify-self-end">
          {renderLink({ href: profileHref, label: profileLabel })}
        </div>
      </div>
      {subtitle ? <div className="md:hidden">{subtitle}</div> : null}
    </div>
  );
}
