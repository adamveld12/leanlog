import type { NavLink } from './PageNavHeading';

// The app's primary navigation: Execute (day list command center) and Goals
// (target planning command center) — #56.
export const APP_NAV_LINKS: NavLink[] = [
  { href: '/track', label: 'Execute' },
  { href: '/track/goals', label: 'Goals' },
  { href: '/track/nutrition-facts', label: 'Nutrition Facts' },
];
