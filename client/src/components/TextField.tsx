import { StyleSheet, Text, TextInput, View } from 'react-native';

import { useAppTheme } from '../theme';

type TextFieldProps = {
  errorText?: string;
  helperText?: string;
  label?: string;
  multiline?: boolean;
  onChangeText: (value: string) => void;
  placeholder?: string;
  testID?: string;
  value: string;
};

export function TextField({
  errorText,
  helperText,
  label,
  multiline = false,
  onChangeText,
  placeholder,
  testID,
  value,
}: TextFieldProps) {
  const { theme, tokens } = useAppTheme();
  const hasError = Boolean(errorText);

  const styles = StyleSheet.create({
    helper: {
      color: hasError ? theme.colors.danger : theme.colors.textSecondary,
      fontFamily: tokens.typography.fontFamily.body,
      fontSize: tokens.typography.fontSize.caption,
      lineHeight: tokens.typography.lineHeight.caption,
    },
    input: {
      backgroundColor: theme.colors.inputBackground,
      borderColor: hasError ? theme.colors.danger : theme.colors.border,
      borderRadius: tokens.radii.md,
      borderWidth: 1,
      color: theme.colors.textPrimary,
      fontFamily: tokens.typography.fontFamily.body,
      fontSize: tokens.typography.fontSize.body,
      lineHeight: tokens.typography.lineHeight.body,
      minHeight: multiline
        ? tokens.touchTargets.minimum * 2
        : tokens.touchTargets.minimum,
      paddingHorizontal: tokens.spacing.md,
      paddingVertical: tokens.spacing.sm,
      textAlignVertical: multiline ? 'top' : 'center',
    },
    label: {
      color: theme.colors.textPrimary,
      fontFamily: tokens.typography.fontFamily.body,
      fontSize: tokens.typography.fontSize.label,
      fontWeight: tokens.typography.fontWeight.semibold,
      lineHeight: tokens.typography.lineHeight.label,
    },
    wrapper: {
      gap: tokens.spacing.xs,
    },
  });

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        multiline={multiline}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textSecondary}
        style={styles.input}
        testID={testID}
        value={value}
      />
      {errorText || helperText ? (
        <Text style={styles.helper}>{errorText ?? helperText}</Text>
      ) : null}
    </View>
  );
}
