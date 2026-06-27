import type { NavLink } from './PageNavHeading';

// The app's primary navigation: Execute (day list command center), Goals (target
// planning + progress trend charts — #56/#68), Nutrition Facts. The trend charts
// live at the bottom of Goals rather than a separate tab to keep the mobile nav
// from overflowing the header (#68).
export const APP_NAV_LINKS: NavLink[] = [
  { href: '/track', label: 'Execute' },
  { href: '/track/goals', label: 'Goals' },
  { href: '/track/nutrition-facts', label: 'Nutrition Facts' },
];
