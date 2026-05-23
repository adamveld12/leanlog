import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

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

if (errors.length) {
  console.error(errors.map((e) => `- ${e}`).join('\n'));
  process.exit(1);
}
console.info('Design system audit passed.');
