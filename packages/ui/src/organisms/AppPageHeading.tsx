import { AnalyticsScope } from '../analytics/AnalyticsScope';
import { APP_NAV_LINKS } from './appNav';
import { PageNavHeading, type NavLink, type PageNavHeadingProps } from './PageNavHeading';

export type AppPageHeadingProps = Omit<PageNavHeadingProps, 'navLinks'> & {
  navLinks?: NavLink[];
};

export function AppPageHeading({ navLinks = APP_NAV_LINKS, ...props }: AppPageHeadingProps) {
  return (
    <AnalyticsScope properties={{ organism: 'AppPageHeading' }}>
      <PageNavHeading {...props} navLinks={navLinks} />
    </AnalyticsScope>
  );
}
