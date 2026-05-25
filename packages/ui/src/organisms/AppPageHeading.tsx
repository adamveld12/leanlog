import { AnalyticsScope } from '../analytics';
import { PageNavHeading, type PageNavHeadingProps } from './PageNavHeading';

export type AppPageHeadingProps = Omit<PageNavHeadingProps, 'profileHref'> & {
  profileHref?: string;
};

export function AppPageHeading({ profileHref = '/track/profile', ...props }: AppPageHeadingProps) {
  return (
    <AnalyticsScope properties={{ organism: 'AppPageHeading' }}>
      <PageNavHeading {...props} profileHref={profileHref} />
    </AnalyticsScope>
  );
}
