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
  /** When set, a link to the dedicated Nutrition Facts Database page (#49). */
  nutritionFactsHref?: string;
  backLabel?: string;
  profileLabel?: string;
  nutritionFactsLabel?: string;
  renderNavLink: (props: NavLinkRenderProps) => ReactNode;
  rightContent?: ReactNode;
};

export function PageNavHeading({
  title,
  subtitle,
  backHref,
  profileHref,
  nutritionFactsHref,
  backLabel = '← Back',
  profileLabel = 'Profile',
  nutritionFactsLabel = 'Nutrition Facts',
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
  return (
    <AnalyticsScope properties={{ organism: 'PageNavHeading' }}>
      <div className={cn(recipes.stack.sm, 'w-full')}>
        <div className={cn(recipes.stack.row, recipes.stack.between, 'w-full')}>
          <div className={cn(recipes.stack.row, 'min-w-0')}>
            {backHref ? (
              <div className="hidden min-[512px]:inline-flex">
                {/* renderNavLink is an intentional render prop: the consumer injects a
                    router-aware link. Converting it to a child component would change the
                    public template API across every page. */}
                {/* react-doctor-disable-next-line react-doctor/no-render-in-render */}
                {renderNavLink({ href: backHref, label: backLabel, className: linkClassName })}
              </div>
            ) : null}
            <PageTitle>{title}</PageTitle>
            {subtitle ? <div className="hidden px-4 min-[512px]:inline">{subtitle}</div> : null}
          </div>
          <div className={cn(recipes.stack.row, 'shrink-0')}>
            {nutritionFactsHref
              ? // Shown on all viewports (mobile is the primary target), mirroring the
                // always-visible Profile link, so the page is reachable from the header
                // everywhere — not just on wide screens.
                // react-doctor-disable-next-line react-doctor/no-render-in-render
                renderNavLink({
                  href: nutritionFactsHref,
                  label: nutritionFactsLabel,
                  className: linkClassName,
                })
              : null}
            {/* react-doctor-disable-next-line react-doctor/no-render-in-render */}
            {renderNavLink({ href: profileHref, label: profileLabel, className: linkClassName })}
            {rightContent}
          </div>
        </div>
        {subtitle ? <div className="w-full min-[512px]:hidden">{subtitle}</div> : null}
      </div>
    </AnalyticsScope>
  );
}
