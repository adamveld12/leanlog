import type { ReactNode } from 'react';

type NavLinkRenderProps = { href: string; label: string; className: string };

export type PageNavHeadingProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  backHref?: string;
  profileHref: string;
  backLabel?: string;
  profileLabel?: string;
  renderNavLink?: (props: NavLinkRenderProps) => ReactNode;
  rightContent?: ReactNode;
};

export function PageNavHeading({
  title,
  subtitle,
  backHref,
  profileHref,
  backLabel = '← Back',
  profileLabel = 'Profile',
  renderNavLink,
  rightContent,
}: PageNavHeadingProps) {
  const linkClassName =
    'my-2.5 inline-flex h-9 items-center justify-center rounded-[10px] bg-transparent px-3 text-xs font-semibold text-[var(--ll-text-muted)] transition duration-[140ms] ease-[var(--ll-ease)] hover:bg-[color-mix(in_srgb,var(--ll-line)_25%,transparent)] hover:text-[var(--ll-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--ll-focus)_35%,transparent)]';
  const renderLink = ({ href, label }: { href: string; label: string }) =>
    renderNavLink ? (
      renderNavLink({ href, label, className: linkClassName })
    ) : (
      <a className={linkClassName} href={href}>
        {label}
      </a>
    );

  return (
    <div className="flex w-full flex-col gap-2.5">
      <div className="flex w-full items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {backHref ? (
            <span className="md:inline-flex max-[512px]:hidden">
              {renderLink({ href: backHref, label: backLabel })}
            </span>
          ) : null}
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--ll-text)]">{title}</h1>
          {subtitle ? <div className="px-5 md:inline max-[512px]:hidden">{subtitle}</div> : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {renderLink({ href: profileHref, label: profileLabel })}
          {rightContent}
        </div>
      </div>
      {subtitle ? <div className="w-full min-[512px]:hidden">{subtitle}</div> : null}
    </div>
  );
}
