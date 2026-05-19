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
    <div className="ll-stack w-full">
      <div className="flex w-full items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {backHref ? (
            <span className="md:inline-flex max-[512px]:hidden">
              {renderLink({ href: backHref, label: backLabel })}
            </span>
          ) : null}
          <h1 className="ll-page-title">{title}</h1>
          {subtitle ? <div className="px-5 md:inline max-[512px]:hidden">{subtitle}</div> : null}
        </div>
        <div className="shrink-0">{renderLink({ href: profileHref, label: profileLabel })}</div>
      </div>
      {subtitle ? <div className="w-full min-[512px]:hidden">{subtitle}</div> : null}
    </div>
  );
}
