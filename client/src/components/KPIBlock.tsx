import { StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '../theme';

type KpiTone = 'accent' | 'neutral' | 'positive' | 'warning';

type KPIBlockProps = {
  label: string;
  supportingText?: string;
  tone?: KpiTone;
  value: string;
};

export function KPIBlock({
  label,
  supportingText,
  tone = 'neutral',
  value,
}: KPIBlockProps) {
  const { theme, tokens } = useAppTheme();

  const tones = {
    accent: {
      backgroundColor: theme.colors.accentSoft,
      valueColor: theme.colors.accentStrong,
    },
    neutral: {
      backgroundColor: theme.colors.surfaceMuted,
      valueColor: theme.colors.textPrimary,
    },
    positive: {
      backgroundColor: theme.colors.surfaceMuted,
      valueColor: theme.colors.success,
    },
    warning: {
      backgroundColor: theme.colors.surfaceMuted,
      valueColor: theme.colors.warning,
    },
  } as const;

  const palette = tones[tone];

  const styles = StyleSheet.create({
    label: {
      color: theme.colors.textSecondary,
      fontFamily: tokens.typography.fontFamily.body,
      fontSize: tokens.typography.fontSize.caption,
      fontWeight: tokens.typography.fontWeight.bold,
      letterSpacing: tokens.typography.letterSpacing.wide,
      lineHeight: tokens.typography.lineHeight.caption,
      textTransform: 'uppercase',
    },
    supportingText: {
      color: theme.colors.textSecondary,
      fontFamily: tokens.typography.fontFamily.body,
      fontSize: tokens.typography.fontSize.caption,
      lineHeight: tokens.typography.lineHeight.caption,
    },
    value: {
      fontFamily: tokens.typography.fontFamily.display,
      fontSize: tokens.typography.fontSize.metric,
      fontWeight: tokens.typography.fontWeight.heavy,
      lineHeight: tokens.typography.lineHeight.metric,
    },
    wrapper: {
      borderRadius: tokens.radii.md,
      gap: tokens.spacing.xxs,
      minWidth: 150,
      padding: tokens.spacing.md,
    },
  });

  return (
    <View style={[styles.wrapper, { backgroundColor: palette.backgroundColor }]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color: palette.valueColor }]}>{value}</Text>
      {supportingText ? (
        <Text style={styles.supportingText}>{supportingText}</Text>
      ) : null}
    </View>
  );
}
