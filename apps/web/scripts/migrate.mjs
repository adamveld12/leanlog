import { execSync } from 'child_process';

const branch = process.env.CF_PAGES_BRANCH;

if (!branch) {
  console.log('CF_PAGES_BRANCH not set — skipping remote migrations');
  process.exit(0);
}

console.log(`Applying migrations to DB (branch: ${branch})...`);
execSync(`pnpx wrangler d1 migrations apply DB --remote`, { stdio: 'inherit' });
