import type { PropsWithChildren, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useAppTheme } from '../theme';

type CardProps = PropsWithChildren<{
  footer?: ReactNode;
  header?: ReactNode;
  testID?: string;
}>;

export function Card({ children, footer, header, testID }: CardProps) {
  const { theme, tokens } = useAppTheme();

  const styles = StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surfaceRaised,
      borderColor: theme.colors.border,
      borderRadius: tokens.radii.lg,
      borderWidth: 1,
      gap: tokens.spacing.md,
      padding: tokens.spacing.lg,
    },
    footer: {
      paddingTop: tokens.spacing.sm,
    },
    header: {
      paddingBottom: tokens.spacing.xs,
    },
  });

  return (
    <View style={[styles.card, tokens.elevation.card]} testID={testID}>
      {header ? <View style={styles.header}>{header}</View> : null}
      {children}
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );
}
