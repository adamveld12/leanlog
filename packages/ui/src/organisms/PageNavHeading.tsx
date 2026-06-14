import type { ReactNode } from 'react';
import { AnalyticsScope } from '../analytics/AnalyticsScope';
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
  renderNavLink: (props: NavLinkRenderProps) => ReactNode;
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
    renderNavLink({ href, label, className: linkClassName });

  return (
    <AnalyticsScope properties={{ organism: 'PageNavHeading' }}>
      <div className={cn(recipes.stack.sm, 'w-full')}>
        <div className={cn(recipes.stack.row, recipes.stack.between, 'w-full')}>
          <div className={cn(recipes.stack.row, 'min-w-0')}>
            {backHref ? (
              <div className="hidden min-[512px]:inline-flex">
                {renderLink({ href: backHref, label: backLabel })}
              </div>
            ) : null}
            <PageTitle>{title}</PageTitle>
            {subtitle ? <div className="hidden px-4 min-[512px]:inline">{subtitle}</div> : null}
          </div>
          <div className={cn(recipes.stack.row, 'shrink-0')}>
            {renderLink({ href: profileHref, label: profileLabel })}
            {rightContent}
          </div>
        </div>
        {subtitle ? <div className="w-full min-[512px]:hidden">{subtitle}</div> : null}
      </div>
    </AnalyticsScope>
  );
}
