import { createWorkspaceConfig, globals } from '@upi-spend-tracker/eslint-config';

export default createWorkspaceConfig({
  globalsMap: globals.browser,
  restrictedImports: [
    [
      [
        '@upi-spend-tracker/api',
        '@upi-spend-tracker/worker',
        '../server/*',
        '../../server/*',
        '../../../server/*',
        'server/*',
      ],
      'Client code must not import from server workspaces.',
    ],
  ],
});
