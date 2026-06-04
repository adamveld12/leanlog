import { spawn } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const generatedDevVarsPath = '.dev.vars';

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} ${args.join(' ')} exited with ${signal ?? code}`));
    });
  });
}

function writeGeneratedDevVars() {
  if (existsSync(generatedDevVarsPath)) {
    throw new Error(
      'apps/web/.dev.vars already exists. Move optional function secrets to apps/web/.env.functions.local, then remove apps/web/.dev.vars.',
    );
  }

  if (!existsSync('.env.local')) {
    throw new Error(
      'apps/web/.env.local is required for local dev. Create it with the Clerk test publishable key.',
    );
  }

  const parts = [];
  for (const file of ['.env.local', '.env.functions.local']) {
    if (!existsSync(file)) continue;
    parts.push(`# Generated from ${file}`);
    parts.push(readFileSync(file, 'utf8').trimEnd());
  }

  writeFileSync(generatedDevVarsPath, `${parts.filter(Boolean).join('\n')}\n`);
}

function cleanupGeneratedDevVars() {
  rmSync(generatedDevVarsPath, { force: true });
}

function forwardSignal(child, signal) {
  process.on(signal, () => {
    cleanupGeneratedDevVars();
    child.kill(signal);
  });
}

async function main() {
  await run('pnpm', ['dev:db:migrate']);
  writeGeneratedDevVars();

  const wrangler = spawn(
    'wrangler',
    ['pages', 'dev', './public', '--port', '8788', '--persist-to', '.wrangler/state'],
    { stdio: 'inherit' },
  );

  forwardSignal(wrangler, 'SIGINT');
  forwardSignal(wrangler, 'SIGTERM');

  wrangler.on('error', (error) => {
    cleanupGeneratedDevVars();
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });

  wrangler.on('exit', (code, signal) => {
    cleanupGeneratedDevVars();
    if (signal) process.kill(process.pid, signal);
    process.exit(code ?? 0);
  });
}

main().catch((error) => {
  cleanupGeneratedDevVars();
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
