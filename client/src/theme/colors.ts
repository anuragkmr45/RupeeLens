import { lightTheme } from '@upi-spend-tracker/mobile-ui';

export const colors = {
  ...lightTheme.colors,
  heroGlowPrimary: lightTheme.colors.glowPrimary,
  heroGlowSecondary: lightTheme.colors.glowSecondary,
} as const;
