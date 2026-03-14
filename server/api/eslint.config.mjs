import { createWorkspaceConfig, globals } from '@upi-spend-tracker/eslint-config';

export default createWorkspaceConfig({
  globalsMap: globals.node,
  restrictedImports: [
    [
      [
        '@upi-spend-tracker/client',
        '../client/*',
        '../../client/*',
        '../../../client/*',
        'client/*',
      ],
      'Server code must not import from the client workspace.',
    ],
  ],
});
