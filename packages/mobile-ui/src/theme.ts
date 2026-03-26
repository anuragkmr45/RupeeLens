export const designTokens = {
  elevation: {
    card: {
      elevation: 2,
      shadowColor: '#10131A',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 18,
    },
    sheet: {
      elevation: 6,
      shadowColor: '#10131A',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.16,
      shadowRadius: 22,
    },
  },
  iconSizes: {
    md: 18,
    sm: 14,
    xl: 24,
  },
  motion: {
    fast: 140,
    normal: 220,
    slow: 320,
  },
  radius: {
    lg: 28,
    md: 22,
    pill: 999,
    sm: 16,
    xl: 32,
  },
  spacing: {
    lg: 20,
    md: 16,
    sm: 12,
    xl: 24,
    xs: 8,
    xxl: 32,
    xxs: 4,
  },
  touch: {
    minTarget: 44,
  },
  typography: {
    body: {
      fontSize: 15,
      fontWeight: '500',
      lineHeight: 22,
    },
    caption: {
      fontSize: 13,
      fontWeight: '500',
      lineHeight: 18,
    },
    eyebrow: {
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.8,
      lineHeight: 16,
      textTransform: 'uppercase',
    },
    fieldLabel: {
      fontSize: 14,
      fontWeight: '700',
      lineHeight: 20,
    },
    kpiLabel: {
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.8,
      lineHeight: 16,
      textTransform: 'uppercase',
    },
    kpiValue: {
      fontSize: 22,
      fontWeight: '800',
      lineHeight: 28,
    },
    sectionTitle: {
      fontSize: 28,
      fontWeight: '800',
      lineHeight: 34,
    },
    subtitle: {
      fontSize: 16,
      fontWeight: '500',
      lineHeight: 24,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      lineHeight: 24,
    },
  },
} as const;

export interface MobileUiThemeColors {
  accentSoft: string;
  accentStrong: string;
  accentText: string;
  canvas: string;
  edge: string;
  edgeStrong: string;
  glowPrimary: string;
  glowSecondary: string;
  ink: string;
  inkMuted: string;
  overlay: string;
  panel: string;
  panelAccent: string;
  panelPositive: string;
  panelStrong: string;
  panelWarm: string;
  panelWarmEdge: string;
  successSoft: string;
  warningSoft: string;
}

export type MobileUiThemeName = 'dark' | 'light';

export interface MobileUiTheme {
  colors: MobileUiThemeColors;
  name: MobileUiThemeName;
  tokens: typeof designTokens;
}

export const lightTheme: MobileUiTheme = {
  colors: {
    accentSoft: '#F2D9C2',
    accentStrong: '#8C4B20',
    accentText: '#5A341D',
    canvas: '#F6F1E8',
    edge: '#D9CFC0',
    edgeStrong: '#C7B8A4',
    glowPrimary: '#F3D4AE',
    glowSecondary: '#E7E2D7',
    ink: '#1F1A17',
    inkMuted: '#6A6058',
    overlay: 'rgba(24, 31, 24, 0.18)',
    panel: '#FFF9F2',
    panelAccent: '#F4E4D1',
    panelPositive: '#DCEFD8',
    panelStrong: '#FFF7EE',
    panelWarm: '#F7E7D3',
    panelWarmEdge: '#E2C7A6',
    successSoft: '#DCEFD8',
    warningSoft: '#F8E8C2',
  },
  name: 'light',
  tokens: designTokens,
};

export const darkTheme: MobileUiTheme = {
  colors: {
    accentSoft: '#5A3A26',
    accentStrong: '#E2A066',
    accentText: '#F8E7D6',
    canvas: '#171310',
    edge: '#342A23',
    edgeStrong: '#5B4C3F',
    glowPrimary: '#3F2B1F',
    glowSecondary: '#22201D',
    ink: '#F7EFE5',
    inkMuted: '#C2B6AA',
    overlay: 'rgba(4, 6, 11, 0.56)',
    panel: '#211B16',
    panelAccent: '#32261E',
    panelPositive: '#223126',
    panelStrong: '#261F19',
    panelWarm: '#31251B',
    panelWarmEdge: '#7D654C',
    successSoft: '#2E4933',
    warningSoft: '#5D4820',
  },
  name: 'dark',
  tokens: designTokens,
};

export const mobileUiThemes = {
  dark: darkTheme,
  light: lightTheme,
} as const;
