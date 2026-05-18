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
    <div className="ll-row ll-between flex-wrap">
      <div className="ll-row flex-wrap">
        {backHref ? renderLink({ href: backHref, label: backLabel }) : null}
        <h1 className="ll-page-title">{title}</h1>
        {subtitle ? <p className="ll-meta">{subtitle}</p> : null}
      </div>
      {renderLink({ href: profileHref, label: profileLabel })}
    </div>
  );
}
