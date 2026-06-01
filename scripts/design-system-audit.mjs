import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';

const errors = [];
const requiredSpecs = [
  'design_system.md',
  'atoms.md',
  'molecules.md',
  'organisms_templates.md',
  'app_pages.md',
  'analytics.md',
  'enforcement.md',
];
for (const spec of requiredSpecs) {
  if (!existsSync(join('packages/ui/specs', spec))) errors.push(`Missing BDD spec: ${spec}`);
}
for (const dir of [
  'packages/ui/src/pages',
  'packages/ui/src/components',
  'apps/web/src/templates',
]) {
  if (existsSync(dir)) errors.push(`Forbidden directory exists: ${dir}`);
}

function files(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (path.includes('node_modules') || path.includes('dist')) continue;
    if (statSync(path).isDirectory()) files(path, acc);
    else acc.push(path);
  }
  return acc;
}

function hasLegacyClass(text) {
  return /className=\{?['"`][^'"`]*(?<!-)\bll-/.test(text) || /^\.ll-/m.test(text);
}

for (const file of files('packages/ui/src').filter((f) => /\.(tsx|css)$/.test(f))) {
  if (hasLegacyClass(readFileSync(file, 'utf8'))) errors.push(`Legacy ll-* class usage: ${file}`);
}
for (const file of files('apps/web/src').filter((f) => /\.(tsx|css)$/.test(f))) {
  if (hasLegacyClass(readFileSync(file, 'utf8'))) errors.push(`Legacy ll-* class usage: ${file}`);
}

for (const file of files('packages/ui/src').filter((f) => f.endsWith('.stories.tsx'))) {
  const text = readFileSync(file, 'utf8');
  if (/title:\s*['"](Components|Composed|Design System\/Pages)\//.test(text)) {
    errors.push(`Invalid Storybook title in ${file}`);
  }
}

for (const file of files('packages/ui/src').filter(
  (f) =>
    /\.(tsx)$/.test(f) &&
    !f.includes('/atoms/') &&
    !f.includes('/test/') &&
    !f.endsWith('.stories.tsx'),
)) {
  const text = readFileSync(file, 'utf8');
  const hasDisallowedRawControl =
    /<(button|select|textarea)\b/.test(text) ||
    (/<input\b/.test(text) && !file.endsWith('RadioGroup.tsx'));
  if (hasDisallowedRawControl) errors.push(`Raw control outside atoms: ${file}`);
}
for (const file of files('apps/web/src/pages').filter((f) => f.endsWith('.tsx'))) {
  const text = readFileSync(file, 'utf8');
  if (/<(button|input|select|textarea)\b/.test(text))
    errors.push(`Raw control in app page: ${file}`);
}

// Check: raw typography elements in app pages (should use design system atoms)
const rawTypographyPattern = /<(small|h3|h4|p|span|a)\b/g;
for (const file of files('apps/web/src/pages').filter((f) => f.endsWith('.tsx'))) {
  const text = readFileSync(file, 'utf8');
  const matches = [...text.matchAll(rawTypographyPattern)];
  for (const m of matches) {
    errors.push(`Raw <${m[1]}> in app page (use design system atom): ${file}`);
  }
}

// Check: raw typography elements in UI package outside atoms/analytics
// Skip matches on lines preceded by eslint-disable comments (intentional exemptions)
function hasEslintDisable(text, matchIndex) {
  const before = text.lastIndexOf('\n', matchIndex);
  const lineStart = before === -1 ? 0 : before + 1;
  const prevLineEnd = before === -1 ? -1 : before;
  const prevLineStart = prevLineEnd <= 0 ? 0 : text.lastIndexOf('\n', prevLineEnd - 1) + 1;
  const prevLine = text.slice(prevLineStart, prevLineEnd);
  const currentLine = text.slice(lineStart, text.indexOf('\n', lineStart));
  return prevLine.includes('eslint-disable') || currentLine.includes('eslint-disable');
}

const uiRawTypographyDirs = [
  'packages/ui/src/molecules',
  'packages/ui/src/organisms',
  'packages/ui/src/templates',
];
for (const dir of uiRawTypographyDirs) {
  for (const file of files(dir).filter((f) => f.endsWith('.tsx') && !f.endsWith('.stories.tsx'))) {
    const text = readFileSync(file, 'utf8');
    const matches = [...text.matchAll(rawTypographyPattern)];
    for (const m of matches) {
      if (hasEslintDisable(text, m.index)) continue;
      errors.push(`Raw <${m[1]}> in UI package outside atoms (use design system atom): ${file}`);
    }
  }
}

// Check: recipe class duplication in app pages (inline recipe class strings)
const recipeDuplicationPatterns = [
  { pattern: /text-\[var\(--ll-warn\)\]/, atom: 'WarningText' },
  { pattern: /text-\[var\(--ll-text-muted\)\]/, atom: 'HelperText/UnitText/Text' },
  { pattern: /text-xs font-semibold uppercase tracking-\[0\.08em\]/, atom: 'SectionHeading' },
];
for (const file of files('apps/web/src/pages').filter((f) => f.endsWith('.tsx'))) {
  const text = readFileSync(file, 'utf8');
  for (const { pattern, atom } of recipeDuplicationPatterns) {
    if (pattern.test(text)) {
      errors.push(`Inline recipe class instead of <${atom}> in app page: ${file}`);
    }
  }
}
for (const dir of uiRawTypographyDirs) {
  for (const file of files(dir).filter((f) => f.endsWith('.tsx') && !f.endsWith('.stories.tsx'))) {
    const text = readFileSync(file, 'utf8');
    for (const { pattern, atom } of recipeDuplicationPatterns) {
      if (pattern.test(text)) {
        errors.push(`Inline recipe class instead of <${atom}> in UI package: ${file}`);
      }
    }
  }
}

// Check: layout composition (#1 cross-file duplication, #2 token re-specification)
// The design system requires composing layout from recipes.* tokens via cn()
// rather than hand-rolling flex/grid class clusters inline. Unlike a verbatim
// string match, this normalizes to the set of layout primitives, so it catches
// a token re-specified even with extra utilities interspersed (#2) and a novel
// layout pattern duplicated across files (#1).
//
// Multi-class layout tokens only — single-class tokens (e.g. stack.between =
// 'justify-between') add no composition value and are intentionally excluded.
// Sorted most-specific-first so a superset literal reports the closest token.
const layoutTokens = [
  {
    token: 'recipes.calendar.cell',
    classes: ['my-0', 'flex', 'min-h-[44px]', 'items-center', 'justify-center'],
  },
  {
    token: 'recipes.stack.actions',
    classes: ['flex', 'flex-wrap', 'items-center', 'justify-end', 'gap-2'],
  },
  {
    token: 'recipes.stack.rowBetween',
    classes: ['flex', 'items-center', 'justify-between'],
  },
  { token: 'recipes.grid.two', classes: ['grid', 'grid-cols-2', 'gap-2'] },
  { token: 'recipes.grid.calendar7', classes: ['grid', 'grid-cols-7', 'gap-0.5'] },
  { token: 'recipes.stack.xs', classes: ['flex', 'flex-col', 'gap-1.5'] },
  { token: 'recipes.stack.sm', classes: ['flex', 'flex-col', 'gap-2.5'] },
  { token: 'recipes.stack.lg', classes: ['flex', 'flex-col', 'gap-4'] },
  { token: 'recipes.stack.center', classes: ['flex', 'justify-center', 'text-center'] },
  { token: 'recipes.stack.row', classes: ['flex', 'items-center', 'gap-2'] },
  { token: 'recipes.stack.rowEnd', classes: ['flex', 'items-end', 'gap-2'] },
].sort((a, b) => b.classes.length - a.classes.length);

const layoutPrimitive =
  /^(flex|grid|inline-flex|flex-row|flex-col|flex-wrap|items-[\w-]+|justify-[\w-]+|content-[\w-]+|self-[\w-]+|place-(?:items|content)-[\w-]+|gap-[\d.]+|gap-[xy]-[\d.]+|grid-cols-\d+|grid-rows-\d+)$/;
const layoutContainer = /^(flex|grid|inline-flex|flex-row|flex-col|flex-wrap)$/;
const stringLiteral = /(['"`])((?:\\.|(?!\1).)*)\1/g;

const layoutSignatures = new Map(); // signature -> Map(file -> key)
const layoutViolations = []; // { key, message }

for (const dir of uiRawTypographyDirs) {
  for (const file of files(dir).filter((f) => f.endsWith('.tsx') && !f.endsWith('.stories.tsx'))) {
    const text = readFileSync(file, 'utf8');
    for (const m of text.matchAll(stringLiteral)) {
      if (hasEslintDisable(text, m.index)) continue;
      const classList = m[2].split(/\s+/).filter(Boolean);
      const layoutClasses = classList.filter((c) => layoutPrimitive.test(c));
      if (layoutClasses.length < 2 || !layoutClasses.some((c) => layoutContainer.test(c))) continue;
      const classSet = new Set(classList);
      const signature = [...new Set(layoutClasses)].sort().join(' ');
      const key = `${file}|${signature}`;
      // #2: literal is a superset of an existing multi-class layout token.
      const matched = layoutTokens.find((t) => t.classes.every((c) => classSet.has(c)));
      if (matched) {
        layoutViolations.push({
          key,
          message: `Inline layout classes should compose from ${matched.token} via cn(): ${file}`,
        });
        continue;
      }
      // #1: bucket by normalized signature for cross-file duplication.
      if (!layoutSignatures.has(signature)) layoutSignatures.set(signature, new Map());
      layoutSignatures.get(signature).set(file, key);
    }
  }
}

for (const [signature, fileMap] of layoutSignatures) {
  if (fileMap.size < 2) continue;
  for (const [file, key] of fileMap) {
    layoutViolations.push({
      key,
      message: `Repeated inline layout signature "${signature}" across ${fileMap.size} files (extract a recipes.* token): ${file}`,
    });
  }
}

if (process.env.AUDIT_PRINT_LAYOUT) {
  const keys = [...new Set(layoutViolations.map((v) => v.key))].sort();
  console.error('LAYOUT KEYS:\n' + keys.map((k) => `  '${k}',`).join('\n'));
}
for (const v of layoutViolations) {
  errors.push(v.message);
}

// Check: raw typography tags carrying text styling in story files (use Text/UnitText atoms).
// Only styled tags are flagged — bare structural tags and non-text spans (e.g. color swatches)
// are fine. Add an eslint-disable comment on the preceding line to opt out (typography demos).
const storyTypographyTag = /<(span|p|a)\b[\s\S]*?>/g;
const typographySignal =
  /text-\[var\(--ll-[\w-]+\)\]|text-(?:xs|sm|base|lg|2xl)|font-(?:medium|semibold|normal)/;
for (const file of files('packages/ui/src').filter((f) => f.endsWith('.stories.tsx'))) {
  const text = readFileSync(file, 'utf8');
  for (const m of text.matchAll(storyTypographyTag)) {
    if (!typographySignal.test(m[0])) continue;
    if (hasEslintDisable(text, m.index)) continue;
    errors.push(`Raw <${m[1]}> with typography styling in story (use Text/UnitText atom): ${file}`);
  }
}

// Check: Storybook coverage — every component .tsx must have a .stories.tsx
// Typography.stories.tsx covers: PageTitle, SectionHeading, HelperText, WarningText, UnitText
const typographyStoryCovered = new Set([
  'PageTitle.tsx',
  'SectionHeading.tsx',
  'HelperText.tsx',
  'WarningText.tsx',
  'UnitText.tsx',
]);
const componentDirs = [
  'packages/ui/src/atoms',
  'packages/ui/src/molecules',
  'packages/ui/src/organisms',
  'packages/ui/src/templates',
];
for (const dir of componentDirs) {
  if (!existsSync(dir)) continue;
  for (const entry of readdirSync(dir)) {
    if (!entry.endsWith('.tsx') || entry.endsWith('.stories.tsx') || entry.endsWith('.test.tsx'))
      continue;
    if (typographyStoryCovered.has(entry)) continue;
    const storyFile = join(dir, entry.replace('.tsx', '.stories.tsx'));
    if (!existsSync(storyFile)) {
      errors.push(`Missing Storybook story: ${join(dir, entry)} (create ${basename(storyFile)})`);
    }
  }
}

if (errors.length) {
  console.error(errors.map((e) => `- ${e}`).join('\n'));
  process.exit(1);
}
console.info('Design system audit passed.');
