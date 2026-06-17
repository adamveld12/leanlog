import { Fragment, type ReactNode } from 'react';
import { AnalyticsScope } from '../analytics/AnalyticsScope';
import { PageTitle } from '../atoms/PageTitle';
import { recipes } from '../styles/recipes';
import { cn } from '../styles/cn';

type NavLinkRenderProps = { href: string; label: string; className: string };

export type NavLink = { href: string; label: string };

export type PageNavHeadingProps = {
  // Retained for API compatibility, but the h1 always shows the app name; the
  // current page is indicated by the active (underlined) nav link instead (#56).
  title?: ReactNode;
  subtitle?: ReactNode;
  backHref?: string;
  // Primary navigation links rendered to the right of the title (#56: Execute,
  // Goals, Nutrition Facts). Each is rendered through renderNavLink so the
  // consumer can inject a router-aware link.
  navLinks: NavLink[];
  backLabel?: string;
  renderNavLink: (props: NavLinkRenderProps) => ReactNode;
  rightContent?: ReactNode;
};

export function PageNavHeading({
  subtitle,
  backHref,
  navLinks,
  backLabel = '← Back',
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
            <PageTitle>LeanLog</PageTitle>
            {subtitle ? <div className="hidden px-4 min-[512px]:inline">{subtitle}</div> : null}
          </div>
          <div className={cn(recipes.stack.row, 'shrink-0')}>
            {navLinks.map((link) => (
              <Fragment key={link.href}>
                {/* react-doctor-disable-next-line react-doctor/no-render-in-render */}
                {renderNavLink({ href: link.href, label: link.label, className: linkClassName })}
              </Fragment>
            ))}
            {rightContent}
          </div>
        </div>
        {subtitle ? <div className="w-full min-[512px]:hidden">{subtitle}</div> : null}
      </div>
    </AnalyticsScope>
  );
}
