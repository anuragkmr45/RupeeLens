import { createWorkspaceConfig, globals } from '@upi-spend-tracker/eslint-config';

export default createWorkspaceConfig({
  globalsMap: globals.node,
  restrictedImports: [
    [
      [
        '@upi-spend-tracker/client',
        '@upi-spend-tracker/api',
        '@upi-spend-tracker/worker',
        '@upi-spend-tracker/shared-utils',
        '@upi-spend-tracker/contracts',
      ],
      'shared-types must stay isolated from app code and runtime helper packages.',
    ],
  ],
});
