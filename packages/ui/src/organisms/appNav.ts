import type { NavLink } from './PageNavHeading';

// The app's primary navigation: Execute (day list command center), Stats (weight
// + measurement trend charts — #68), Goals (target planning) — #56.
export const APP_NAV_LINKS: NavLink[] = [
  { href: '/track', label: 'Execute' },
  { href: '/track/stats', label: 'Stats' },
  { href: '/track/goals', label: 'Goals' },
  { href: '/track/nutrition-facts', label: 'Nutrition Facts' },
];
