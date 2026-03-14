import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '../theme';

type ListItemProps = {
  detail?: string;
  leading?: ReactNode;
  onPress?: () => void;
  subtitle?: string;
  testID?: string;
  title: string;
  trailing?: ReactNode;
};

export function ListItem({
  detail,
  leading,
  onPress,
  subtitle,
  testID,
  title,
  trailing,
}: ListItemProps) {
  const { theme, tokens } = useAppTheme();

  const styles = StyleSheet.create({
    accessorySlot: {
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: tokens.touchTargets.minimum,
    },
    body: {
      flex: 1,
      gap: tokens.spacing.xxs,
    },
    container: {
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: tokens.radii.md,
      borderWidth: 1,
      flexDirection: 'row',
      gap: tokens.spacing.md,
      minHeight: tokens.touchTargets.minimum + tokens.spacing.xs,
      paddingHorizontal: tokens.spacing.md,
      paddingVertical: tokens.spacing.sm,
    },
    detail: {
      color: theme.colors.textSecondary,
      fontFamily: tokens.typography.fontFamily.body,
      fontSize: tokens.typography.fontSize.caption,
      fontWeight: tokens.typography.fontWeight.medium,
      lineHeight: tokens.typography.lineHeight.caption,
    },
    subtitle: {
      color: theme.colors.textSecondary,
      fontFamily: tokens.typography.fontFamily.body,
      fontSize: tokens.typography.fontSize.body,
      lineHeight: tokens.typography.lineHeight.body,
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: tokens.typography.fontFamily.body,
      fontSize: tokens.typography.fontSize.body,
      fontWeight: tokens.typography.fontWeight.semibold,
      lineHeight: tokens.typography.lineHeight.body,
    },
  });

  const content = (
    <>
      {leading ? <View style={styles.accessorySlot}>{leading}</View> : null}
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        {detail ? <Text style={styles.detail}>{detail}</Text> : null}
      </View>
      {trailing ? <View style={styles.accessorySlot}>{trailing}</View> : null}
    </>
  );

  if (!onPress) {
    return (
      <View style={styles.container} testID={testID}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        pressed && { transform: [{ scale: tokens.motion.scale.pressed }] },
      ]}
      testID={testID}
    >
      {content}
    </Pressable>
  );
}
