import { useColorScheme } from 'react-native';

// Ported from the web design tokens (`--ll-*` in packages/ui/src/index.css).
// Keep the two in sync by hand; they are copies, not shared code.
const lightColors = {
  bg: '#f5f5f3',
  surface: '#ffffff',
  text: '#151515',
  textMuted: '#606060',
  line: '#e8e8e8',
  lineStrong: '#d3d3d3',
  danger: '#be2222',
  warn: '#b35a11',
  saved: '#3d8f5a',
  focus: '#8c8c8c',
  // Text on a filled (primary) control.
  onPrimary: '#ffffff',
};

const darkColors: typeof lightColors = {
  bg: '#111111',
  surface: '#171717',
  text: '#f3f3f3',
  textMuted: '#b9b9b9',
  line: '#303030',
  lineStrong: '#464646',
  danger: '#f36464',
  warn: '#f4a63c',
  saved: '#53bf79',
  focus: '#9d9d9d',
  onPrimary: '#111111',
};

export type Colors = typeof lightColors;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;
export const radius = { control: 10, card: 14, pill: 999 } as const;
// Minimum touch target (Android guideline, 48dp; 44 keeps controls compact).
export const MIN_TOUCH = 44;

export function useColors(): Colors {
  const scheme = useColorScheme();
  return scheme === 'dark' ? darkColors : lightColors;
}
