import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const gradleCommand = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';

const suites = {
  'parser-fixtures': [
    {
      command: [gradleCommand, ':app:testDebugUnitTest', '--tests', 'com.upispendtracker.client.capture.NotificationParserRegistryTest'],
      cwd: 'client/android',
      label: 'Android parser fixture catalog',
    },
  ],
  smoke: [
    {
      command: [gradleCommand, ':app:testDebugUnitTest', '--tests', 'com.upispendtracker.client.capture.NotificationParserRegistryTest'],
      cwd: 'client/android',
      label: 'Android parser fixture catalog',
    },
    {
      command: ['pnpm', '--filter', '@upi-spend-tracker/client', 'test', '--', '__tests__/app.test.tsx'],
      label: 'Client critical app flows',
    },
    {
      command: ['pnpm', 'exec', 'vitest', 'run', 'src/modules/sync/sync.mobile-integration.test.ts'],
      cwd: 'server/api',
      label: 'API paired mobile sync integration',
    },
    {
      command: [
        'pnpm',
        'exec',
        'vitest',
        'run',
        'src/modules/rollups/rollups.module.test.ts',
        'src/modules/cleanup/cleanup.module.test.ts',
        'src/modules/exports/export-jobs.module.test.ts',
      ],
      cwd: 'server/worker',
      label: 'Worker rollup cleanup export smoke',
    },
  ],
  regression: [
    {
      command: ['pnpm', 'db:validate'],
      label: 'DB validation',
    },
    {
      command: ['pnpm', 'lint'],
      label: 'Lint',
    },
    {
      command: ['pnpm', 'lint:openapi'],
      label: 'OpenAPI lint',
    },
    {
      command: ['pnpm', 'typecheck'],
      label: 'Typecheck',
    },
    {
      command: ['pnpm', 'test'],
      label: 'Full test suite',
    },
    {
      command: ['pnpm', 'build'],
      label: 'Full build',
    },
  ],
};

function runStep(step) {
  console.log(`\n==> ${step.label}`);
  console.log(step.command.join(' '));

  const result = spawnSync(step.command[0], step.command.slice(1), {
    cwd: step.cwd ? path.join(process.cwd(), step.cwd) : process.cwd(),
    env: process.env,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const suiteName = process.argv[2];

if (!suiteName || !(suiteName in suites)) {
  console.error('Usage: node scripts/qa/run-suite.mjs <parser-fixtures|smoke|regression>');
  process.exit(1);
}

for (const step of suites[suiteName]) {
  runStep(step);
}
