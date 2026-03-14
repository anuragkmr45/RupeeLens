import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { useAppTheme } from '../theme';

type ButtonVariant = 'ghost' | 'primary' | 'secondary';

type ButtonProps = {
  children: ReactNode;
  disabled?: boolean;
  onPress?: () => void;
  testID?: string;
  variant?: ButtonVariant;
};

export function Button({
  children,
  disabled = false,
  onPress,
  testID,
  variant = 'primary',
}: ButtonProps) {
  const { theme, tokens } = useAppTheme();

  const variants = {
    ghost: {
      backgroundColor: 'transparent',
      borderColor: theme.colors.border,
      textColor: theme.colors.textPrimary,
    },
    primary: {
      backgroundColor: theme.colors.accent,
      borderColor: theme.colors.accent,
      textColor: theme.colors.accentContrast,
    },
    secondary: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
      textColor: theme.colors.textPrimary,
    },
  } as const;

  const styles = StyleSheet.create({
    button: {
      alignItems: 'center',
      borderRadius: tokens.radii.pill,
      borderWidth: 1,
      justifyContent: 'center',
      minHeight: tokens.touchTargets.minimum,
      minWidth: tokens.touchTargets.minimum,
      paddingHorizontal: tokens.spacing.lg,
    },
    label: {
      fontFamily: tokens.typography.fontFamily.body,
      fontSize: tokens.typography.fontSize.body,
      fontWeight: tokens.typography.fontWeight.semibold,
      letterSpacing: tokens.typography.letterSpacing.normal,
      lineHeight: tokens.typography.lineHeight.body,
    },
  });

  const palette = variants[variant];

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: palette.backgroundColor,
          borderColor: palette.borderColor,
        },
        disabled && { opacity: tokens.motion.opacity.disabled },
        pressed &&
          !disabled && {
            transform: [{ scale: tokens.motion.scale.pressed }],
          },
      ]}
      testID={testID}
    >
      <Text style={[styles.label, { color: palette.textColor }]}>{children}</Text>
    </Pressable>
  );
}
