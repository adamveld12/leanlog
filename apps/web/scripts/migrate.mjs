import { execSync } from 'child_process';

const branch = process.env.CF_PAGES_BRANCH;

if (!branch) {
  console.log('CF_PAGES_BRANCH not set — skipping remote migrations');
  process.exit(0);
}

const env = branch === 'main' ? '' : '--env preview';
console.log(`Applying migrations to DB (branch: ${branch})...`);
execSync(`pnpx wrangler d1 migrations apply DB --remote ${env}`, { stdio: 'inherit' });

// Preseed the shared nutrition catalog with the curated USDA whole foods (#72).
// The seed is INSERT OR REPLACE keyed on a stable id, so re-running it on every
// deploy force-refreshes the rows in place without creating duplicates.
console.log('Building USDA seed SQL...');
execSync('pnpm --filter @leanlog/data-d1 db:seed:build', { stdio: 'inherit' });
console.log(`Seeding USDA whole foods into DB (branch: ${branch})...`);
execSync(
  `pnpx wrangler d1 execute DB --remote ${env} --yes --file ../../packages/data-d1/seed/usda-whole-foods.sql`,
  { stdio: 'inherit' },
);
