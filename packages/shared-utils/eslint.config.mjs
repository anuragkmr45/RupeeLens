import { createWorkspaceConfig, globals } from '@upi-spend-tracker/eslint-config';

export default createWorkspaceConfig({
  globalsMap: globals.node,
  restrictedImports: [
    [
      [
        '@upi-spend-tracker/client',
        '@upi-spend-tracker/api',
        '@upi-spend-tracker/worker',
        '@upi-spend-tracker/contracts',
      ],
      'shared-utils may depend only on shared-types.',
    ],
  ],
});
