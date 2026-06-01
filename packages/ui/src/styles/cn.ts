import { twMerge } from 'tailwind-merge';
import { recipes } from './recipes';

// Dev-only guard (#5): nudge authors to compose layout from recipe tokens via
// cn() instead of hand-rolling flex/grid class clusters inline. Recipe-sourced
// strings are exempt — they ARE the tokens — so only un-tokenized literals warn.
const recipeClassValues: ReadonlySet<string> = (() => {
  const values = new Set<string>();
  const visit = (node: unknown): void => {
    if (typeof node === 'string') values.add(node);
    else if (node && typeof node === 'object')
      for (const child of Object.values(node)) visit(child);
  };
  visit(recipes);
  return values;
})();

const LAYOUT_CONTAINER = /^(flex|grid|inline-flex|flex-row|flex-col|flex-wrap)$/;
const LAYOUT_PRIMITIVE =
  /^(flex|grid|inline-flex|flex-row|flex-col|flex-wrap|items-[\w-]+|justify-[\w-]+|content-[\w-]+|self-[\w-]+|place-(?:items|content)-[\w-]+|gap-[\d.]+|gap-[xy]-[\d.]+|grid-cols-\d+|grid-rows-\d+)$/;

const warned = new Set<string>();

function warnOnInlineLayout(value: string): void {
  if (recipeClassValues.has(value) || warned.has(value)) return;
  const tokens = value.split(/\s+/).filter(Boolean);
  const hasContainer = tokens.some((t) => LAYOUT_CONTAINER.test(t));
  const layoutCount = tokens.filter((t) => LAYOUT_PRIMITIVE.test(t)).length;
  if (hasContainer && layoutCount >= 2) {
    warned.add(value);
    console.warn(
      `[design-system] inline layout classes "${value}" — compose from a recipes.* token via cn() instead of hand-rolling flex/grid layout.`,
    );
  }
}

export function cn(...classes: Array<string | false | null | undefined>) {
  if (import.meta.env.DEV && import.meta.env.MODE !== 'test') {
    for (const value of classes) if (typeof value === 'string') warnOnInlineLayout(value);
  }
  return twMerge(classes.filter(Boolean).join(' '));
}
