import { execSync } from 'child_process';

const branch = process.env.CF_PAGES_BRANCH;

if (!branch) {
  console.log('CF_PAGES_BRANCH not set — skipping remote migrations');
  process.exit(0);
}

const db = branch === 'main' ? 'leanlog-db' : 'leanlog-db-dev';
console.log(`Applying migrations to ${db} (branch: ${branch})...`);
execSync(`wrangler d1 migrations apply ${db} --remote`, { stdio: 'inherit' });
