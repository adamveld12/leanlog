import type { ReactNode } from 'react';
import { PageTitle } from '../atoms/PageTitle';
import { recipes } from '../styles/recipes';
import { cn } from '../styles/cn';

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
  const linkClassName = cn(
    recipes.control.base,
    recipes.control.size.sm,
    recipes.radius.control,
    recipes.transition,
    recipes.focusRing,
    recipes.button.subtle,
  );
  const renderLink = ({ href, label }: { href: string; label: string }) =>
    renderNavLink ? (
      renderNavLink({ href, label, className: linkClassName })
    ) : (
      // eslint-disable-next-line no-restricted-syntax -- fallback for non-router contexts; app always provides renderNavLink
      <a className={linkClassName} href={href}>
        {label}
      </a>
    );

  return (
    <div className="flex w-full flex-col gap-2.5">
      <div className="flex w-full items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {backHref ? (
            <div className="md:inline-flex max-[512px]:hidden">
              {renderLink({ href: backHref, label: backLabel })}
            </div>
          ) : null}
          <PageTitle>{title}</PageTitle>
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
