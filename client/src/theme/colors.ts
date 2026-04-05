import { darkTheme, lightTheme } from '@upi-spend-tracker/mobile-ui';
import { DynamicColorIOS, Platform, type ColorValue } from 'react-native';

function createAdaptiveColor(light: string, dark: string): ColorValue {
  if (Platform.OS === 'ios' && typeof DynamicColorIOS === 'function') {
    return DynamicColorIOS({
      dark,
      light,
    });
  }

  return light;
}

export const colors = {
  accentSoft: createAdaptiveColor(
    lightTheme.colors.accentSoft,
    darkTheme.colors.accentSoft,
  ),
  accentStrong: createAdaptiveColor(
    lightTheme.colors.accentStrong,
    darkTheme.colors.accentStrong,
  ),
  accentText: createAdaptiveColor(
    lightTheme.colors.accentText,
    darkTheme.colors.accentText,
  ),
  canvas: createAdaptiveColor(
    lightTheme.colors.canvas,
    darkTheme.colors.canvas,
  ),
  edge: createAdaptiveColor(lightTheme.colors.edge, darkTheme.colors.edge),
  edgeStrong: createAdaptiveColor(
    lightTheme.colors.edgeStrong,
    darkTheme.colors.edgeStrong,
  ),
  glowPrimary: createAdaptiveColor(
    lightTheme.colors.glowPrimary,
    darkTheme.colors.glowPrimary,
  ),
  glowSecondary: createAdaptiveColor(
    lightTheme.colors.glowSecondary,
    darkTheme.colors.glowSecondary,
  ),
  heroGlowPrimary: createAdaptiveColor(
    lightTheme.colors.glowPrimary,
    darkTheme.colors.glowPrimary,
  ),
  heroGlowSecondary: createAdaptiveColor(
    lightTheme.colors.glowSecondary,
    darkTheme.colors.glowSecondary,
  ),
  ink: createAdaptiveColor(lightTheme.colors.ink, darkTheme.colors.ink),
  inkMuted: createAdaptiveColor(
    lightTheme.colors.inkMuted,
    darkTheme.colors.inkMuted,
  ),
  overlay: createAdaptiveColor(
    lightTheme.colors.overlay,
    darkTheme.colors.overlay,
  ),
  panel: createAdaptiveColor(lightTheme.colors.panel, darkTheme.colors.panel),
  panelAccent: createAdaptiveColor(
    lightTheme.colors.panelAccent,
    darkTheme.colors.panelAccent,
  ),
  panelPositive: createAdaptiveColor(
    lightTheme.colors.panelPositive,
    darkTheme.colors.panelPositive,
  ),
  panelStrong: createAdaptiveColor(
    lightTheme.colors.panelStrong,
    darkTheme.colors.panelStrong,
  ),
  panelWarm: createAdaptiveColor(
    lightTheme.colors.panelWarm,
    darkTheme.colors.panelWarm,
  ),
  panelWarmEdge: createAdaptiveColor(
    lightTheme.colors.panelWarmEdge,
    darkTheme.colors.panelWarmEdge,
  ),
  successSoft: createAdaptiveColor(
    lightTheme.colors.successSoft,
    darkTheme.colors.successSoft,
  ),
  tabBarBackground: createAdaptiveColor(
    'rgba(255, 247, 238, 0.9)',
    'rgba(38, 31, 25, 0.88)',
  ),
  tabBarBorder: createAdaptiveColor(
    'rgba(199, 184, 164, 0.8)',
    'rgba(91, 76, 63, 0.78)',
  ),
  warningSoft: createAdaptiveColor(
    lightTheme.colors.warningSoft,
    darkTheme.colors.warningSoft,
  ),
};
