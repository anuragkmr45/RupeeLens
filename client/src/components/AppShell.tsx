import { StatusBar } from 'expo-status-bar';
import type { PropsWithChildren } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useAppTheme } from '../theme';

type AppShellProps = PropsWithChildren<{
  contentContainerStyle?: StyleProp<ViewStyle>;
  scrollable?: boolean;
  testID?: string;
}>;

export function AppShell({
  children,
  contentContainerStyle,
  scrollable = true,
  testID,
}: AppShellProps) {
  const { theme, themeName, tokens } = useAppTheme();

  const baseContentStyle = {
    gap: tokens.spacing.xl,
    padding: tokens.spacing.xl,
    paddingBottom: tokens.spacing['3xl'],
  } satisfies ViewStyle;

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.colors.background }]}
    >
      <StatusBar style={themeName === 'dark' ? 'light' : 'dark'} />
      <View
        style={[styles.surface, { backgroundColor: theme.colors.background }]}
        testID={testID}
      >
        {scrollable ? (
          <ScrollView
            contentContainerStyle={[styles.content, baseContentStyle, contentContainerStyle]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={styles.scroll}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.content, baseContentStyle, contentContainerStyle]}>
            {children}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
  },
  safeArea: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  surface: {
    flex: 1,
  },
});
