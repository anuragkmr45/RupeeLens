import { Pressable, StyleSheet, Text } from 'react-native';

import { useAppTheme } from '../theme';

type ChipProps = {
  label: string;
  onPress?: () => void;
  selected?: boolean;
  testID?: string;
};

export function Chip({
  label,
  onPress,
  selected = false,
  testID,
}: ChipProps) {
  const { theme, tokens } = useAppTheme();

  const styles = StyleSheet.create({
    chip: {
      alignItems: 'center',
      borderRadius: tokens.radii.pill,
      borderWidth: 1,
      justifyContent: 'center',
      minHeight: tokens.touchTargets.minimum,
      paddingHorizontal: tokens.spacing.md,
    },
    label: {
      fontFamily: tokens.typography.fontFamily.body,
      fontSize: tokens.typography.fontSize.label,
      fontWeight: tokens.typography.fontWeight.semibold,
      letterSpacing: tokens.typography.letterSpacing.normal,
      lineHeight: tokens.typography.lineHeight.label,
    },
  });

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected
            ? theme.colors.accentSoft
            : theme.colors.surface,
          borderColor: selected
            ? theme.colors.accentStrong
            : theme.colors.border,
        },
        pressed &&
          onPress && {
            transform: [{ scale: tokens.motion.scale.pressed }],
          },
      ]}
      testID={testID}
    >
      <Text
        style={[
          styles.label,
          {
            color: selected ? theme.colors.accentStrong : theme.colors.textPrimary,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}
