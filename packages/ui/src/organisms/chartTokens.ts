import { useEffect, useState } from 'react';

// Canvas colors resolved from the active theme's CSS variables. chart.js writes
// to a canvas and can't resolve var(), so the trend charts read these once and
// re-read on theme mutation. Shared by WeightTrendCard and MeasurementTrendCard.
export type Tokens = { text: string; muted: string; line: string };

export const FALLBACK_TOKENS: Tokens = { text: '#151515', muted: '#606060', line: '#e8e8e8' };

export function readChartTokens(): Tokens {
  if (typeof document === 'undefined') return FALLBACK_TOKENS;
  const cs = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) => cs.getPropertyValue(name).trim() || fallback;
  return {
    text: read('--ll-text', FALLBACK_TOKENS.text),
    muted: read('--ll-text-muted', FALLBACK_TOKENS.muted),
    line: read('--ll-line', FALLBACK_TOKENS.line),
  };
}

export function useChartTokens(): Tokens {
  // Initial value comes from the useState initializer (no extra render); the effect below only
  // re-syncs on later theme mutations, so this isn't a "state initialized from an effect" case.
  const [tokens, setTokens] = useState<Tokens>(readChartTokens);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    // Re-read the canvas colors whenever the theme attribute on <html> changes so the
    // chart tracks the CSS variables. This observer only re-syncs on theme mutation; initial
    // tokens come from useState above, so react-doctor's "state initialized from a mount
    // effect" is a false positive here.
    const observer = new MutationObserver(() => setTokens(readChartTokens()));
    // react-doctor-disable-next-line react-doctor/no-initialize-state
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class'],
    });
    return () => observer.disconnect();
  }, []);
  return tokens;
}
