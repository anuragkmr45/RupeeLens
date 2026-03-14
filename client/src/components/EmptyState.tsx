import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '../theme';

type EmptyStateProps = {
  action?: ReactNode;
  description: string;
  title: string;
};

export function EmptyState({ action, description, title }: EmptyStateProps) {
  const { theme, tokens } = useAppTheme();

  const styles = StyleSheet.create({
    badge: {
      alignItems: 'center',
      backgroundColor: theme.colors.accentSoft,
      borderRadius: tokens.radii.pill,
      height: tokens.iconSizes.xl + tokens.spacing.sm,
      justifyContent: 'center',
      width: tokens.iconSizes.xl + tokens.spacing.sm,
    },
    badgeDot: {
      backgroundColor: theme.colors.accent,
      borderRadius: tokens.radii.pill,
      height: tokens.iconSizes.sm,
      width: tokens.iconSizes.sm,
    },
    description: {
      color: theme.colors.textSecondary,
      fontFamily: tokens.typography.fontFamily.body,
      fontSize: tokens.typography.fontSize.body,
      lineHeight: tokens.typography.lineHeight.body,
      textAlign: 'center',
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: tokens.typography.fontFamily.display,
      fontSize: tokens.typography.fontSize.title,
      fontWeight: tokens.typography.fontWeight.bold,
      lineHeight: tokens.typography.lineHeight.title,
      textAlign: 'center',
    },
    wrapper: {
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: tokens.radii.lg,
      borderWidth: 1,
      gap: tokens.spacing.md,
      padding: tokens.spacing.xl,
    },
  });

  return (
    <View style={styles.wrapper}>
      <View style={styles.badge}>
        <View style={styles.badgeDot} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {action}
    </View>
  );
}
