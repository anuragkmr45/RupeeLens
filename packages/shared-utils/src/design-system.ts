const shadowColor = '#120F0B';

export const designSpacing = {
  none: 0,
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
} as const;

export const designTypography = {
  fontFamily: {
    body: 'System',
    display: 'System',
  },
  fontSize: {
    caption: 12,
    label: 13,
    body: 16,
    bodyLarge: 18,
    title: 24,
    headline: 32,
    metric: 30,
  },
  lineHeight: {
    caption: 16,
    label: 18,
    body: 24,
    bodyLarge: 28,
    title: 30,
    headline: 38,
    metric: 36,
  },
  fontWeight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    heavy: '800',
  },
  letterSpacing: {
    tight: -0.4,
    normal: 0,
    wide: 0.4,
    eyebrow: 1.1,
  },
} as const;

export const designRadii = {
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  pill: 999,
} as const;

export const designElevation = {
  card: {
    elevation: 2,
    shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  floating: {
    elevation: 6,
    shadowColor,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
  },
  sheet: {
    elevation: 12,
    shadowColor,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
  },
} as const;

export const designIconSizes = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
} as const;

export const designMotion = {
  duration: {
    fast: 140,
    moderate: 200,
    slow: 280,
    sheet: 240,
  },
  scale: {
    pressed: 0.98,
  },
  opacity: {
    disabled: 0.45,
  },
} as const;

export const designTouchTargets = {
  minimum: 48,
  comfortable: 56,
} as const;

export const designThemes = {
  light: {
    isDark: false,
    colors: {
      background: '#F6F1E8',
      surface: '#FFF9F2',
      surfaceMuted: '#F2E5D7',
      surfaceRaised: '#FFFFFF',
      border: '#D9C6B2',
      borderStrong: '#B89B80',
      textPrimary: '#211A14',
      textSecondary: '#6C5F54',
      textInverse: '#FFF9F2',
      accent: '#A55B2A',
      accentStrong: '#844119',
      accentSoft: '#F4D6C1',
      accentContrast: '#FFF7F1',
      success: '#2D7B4C',
      warning: '#A66218',
      danger: '#AF3B39',
      inputBackground: '#FFFCF8',
      selection: '#D7A47D',
      backdrop: 'rgba(18, 15, 10, 0.48)',
    },
  },
  dark: {
    isDark: true,
    colors: {
      background: '#16120F',
      surface: '#1E1916',
      surfaceMuted: '#2B241F',
      surfaceRaised: '#28211C',
      border: '#4A3F36',
      borderStrong: '#6D5B4A',
      textPrimary: '#F7F0E7',
      textSecondary: '#C8B8A9',
      textInverse: '#16120F',
      accent: '#F2A063',
      accentStrong: '#FFB885',
      accentSoft: '#663D22',
      accentContrast: '#1A120C',
      success: '#6FC58A',
      warning: '#FFBD6E',
      danger: '#FF8D86',
      inputBackground: '#221C18',
      selection: '#A55B2A',
      backdrop: 'rgba(0, 0, 0, 0.62)',
    },
  },
} as const;

export type DesignThemeName = keyof typeof designThemes;
export type DesignTheme = (typeof designThemes)[DesignThemeName];

export const designTokens = {
  elevation: designElevation,
  iconSizes: designIconSizes,
  motion: designMotion,
  radii: designRadii,
  spacing: designSpacing,
  themes: designThemes,
  touchTargets: designTouchTargets,
  typography: designTypography,
} as const;

export function getDesignTheme(themeName: DesignThemeName): DesignTheme {
  return designThemes[themeName];
}
