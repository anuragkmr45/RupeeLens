import {
  designElevation,
  designIconSizes,
  designMotion,
  designRadii,
  designSpacing,
  designTouchTargets,
  designTypography,
  getDesignTheme,
  type DesignTheme,
  type DesignThemeName,
} from '@upi-spend-tracker/shared-utils';
import {
  createContext,
  useContext,
  useState,
  type PropsWithChildren,
} from 'react';
import { useColorScheme } from 'react-native';

export type ThemePreference = DesignThemeName | 'system';

type ThemeTokens = {
  elevation: typeof designElevation;
  iconSizes: typeof designIconSizes;
  motion: typeof designMotion;
  radii: typeof designRadii;
  spacing: typeof designSpacing;
  touchTargets: typeof designTouchTargets;
  typography: typeof designTypography;
};

type AppThemeContextValue = {
  setThemePreference: (themePreference: ThemePreference) => void;
  theme: DesignTheme;
  themeName: DesignThemeName;
  themePreference: ThemePreference;
  tokens: ThemeTokens;
};

const tokens: ThemeTokens = {
  elevation: designElevation,
  iconSizes: designIconSizes,
  motion: designMotion,
  radii: designRadii,
  spacing: designSpacing,
  touchTargets: designTouchTargets,
  typography: designTypography,
};

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

type AppThemeProviderProps = PropsWithChildren<{
  initialPreference?: ThemePreference;
}>;

export function AppThemeProvider({
  children,
  initialPreference = 'system',
}: AppThemeProviderProps) {
  const systemPreference = useColorScheme() === 'dark' ? 'dark' : 'light';
  const [themePreference, setThemePreference] =
    useState<ThemePreference>(initialPreference);

  const themeName =
    themePreference === 'system' ? systemPreference : themePreference;

  return (
    <AppThemeContext.Provider
      value={{
        setThemePreference,
        theme: getDesignTheme(themeName),
        themeName,
        themePreference,
        tokens,
      }}
    >
      {children}
    </AppThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(AppThemeContext);

  if (!context) {
    throw new Error('useAppTheme must be used within an AppThemeProvider.');
  }

  return context;
}
