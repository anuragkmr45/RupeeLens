import { describe, expect, it } from 'vitest';

import {
  designSpacing,
  designThemes,
  designTouchTargets,
  getDesignTheme,
} from './design-system.js';

describe('design system tokens', () => {
  it('exports shared theme tokens for both light and dark modes', () => {
    expect(Object.keys(designThemes)).toEqual(['light', 'dark']);
    expect(getDesignTheme('light').colors.background).not.toBe(
      getDesignTheme('dark').colors.background,
    );
    expect(designSpacing.xl).toBe(24);
  });

  it('keeps touch targets at or above the accessibility baseline', () => {
    expect(designTouchTargets.minimum).toBeGreaterThanOrEqual(48);
    expect(designTouchTargets.comfortable).toBeGreaterThan(
      designTouchTargets.minimum,
    );
  });
});
