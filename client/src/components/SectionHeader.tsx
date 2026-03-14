import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '../theme';

type SectionHeaderProps = {
  action?: ReactNode;
  eyebrow?: string;
  subtitle?: string;
  title: string;
};

export function SectionHeader({
  action,
  eyebrow,
  subtitle,
  title,
}: SectionHeaderProps) {
  const { theme, tokens } = useAppTheme();

  const styles = StyleSheet.create({
    eyebrow: {
      color: theme.colors.textSecondary,
      fontFamily: tokens.typography.fontFamily.body,
      fontSize: tokens.typography.fontSize.caption,
      fontWeight: tokens.typography.fontWeight.bold,
      letterSpacing: tokens.typography.letterSpacing.eyebrow,
      lineHeight: tokens.typography.lineHeight.caption,
      textTransform: 'uppercase',
    },
    header: {
      alignItems: 'flex-start',
      flexDirection: 'row',
      gap: tokens.spacing.md,
      justifyContent: 'space-between',
    },
    subtitle: {
      color: theme.colors.textSecondary,
      fontFamily: tokens.typography.fontFamily.body,
      fontSize: tokens.typography.fontSize.body,
      lineHeight: tokens.typography.lineHeight.body,
    },
    textStack: {
      flex: 1,
      gap: tokens.spacing.xxs,
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: tokens.typography.fontFamily.display,
      fontSize: tokens.typography.fontSize.title,
      fontWeight: tokens.typography.fontWeight.bold,
      lineHeight: tokens.typography.lineHeight.title,
    },
  });

  return (
    <View style={styles.header}>
      <View style={styles.textStack}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  );
}
