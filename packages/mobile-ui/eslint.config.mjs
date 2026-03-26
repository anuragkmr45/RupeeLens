import { createWorkspaceConfig, globals } from '@upi-spend-tracker/eslint-config';

export default createWorkspaceConfig({
  globalsMap: globals.browser,
  restrictedImports: [
    [
      [
        '@upi-spend-tracker/client',
        '@upi-spend-tracker/api',
        '@upi-spend-tracker/worker',
        '../client/*',
        '../../client/*',
        '../server/*',
        '../../server/*',
      ],
      'mobile-ui must stay app-agnostic and may not import client or server workspaces.',
    ],
  ],
});
