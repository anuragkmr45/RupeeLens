import { createContext, type ReactNode, useContext } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
  type ColorValue,
  type KeyboardTypeOptions,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  designTokens,
  lightTheme,
  mobileUiThemes,
  type MobileUiTheme,
  type MobileUiThemeName,
} from './theme';

const MobileUiThemeContext = createContext<MobileUiTheme>(lightTheme);

type CardTone = 'accent' | 'default' | 'positive' | 'warm';
type ButtonVariant = 'ghost' | 'primary' | 'secondary';
type ChipTone = 'default' | 'pending' | 'ready';

function resolveTheme(themeName?: MobileUiThemeName): MobileUiTheme {
  if (themeName) {
    return mobileUiThemes[themeName];
  }

  return lightTheme;
}

function getCardBackground(theme: MobileUiTheme, tone: CardTone): string {
  switch (tone) {
    case 'accent':
      return theme.colors.panelAccent;
    case 'positive':
      return theme.colors.panelPositive;
    case 'warm':
      return theme.colors.panelWarm;
    case 'default':
    default:
      return theme.colors.panelStrong;
  }
}

function getChipColors(
  theme: MobileUiTheme,
  tone: ChipTone,
  selected: boolean,
) {
  if (selected) {
    return {
      backgroundColor: theme.colors.accentStrong,
      borderColor: theme.colors.accentStrong,
      labelColor: theme.colors.panelStrong,
    };
  }

  switch (tone) {
    case 'pending':
      return {
        backgroundColor: theme.colors.warningSoft,
        borderColor: theme.colors.warningSoft,
        labelColor: theme.colors.accentText,
      };
    case 'ready':
      return {
        backgroundColor: theme.colors.successSoft,
        borderColor: theme.colors.successSoft,
        labelColor: theme.colors.accentText,
      };
    case 'default':
    default:
      return {
        backgroundColor: theme.colors.panel,
        borderColor: theme.colors.edgeStrong,
        labelColor: theme.colors.accentText,
      };
  }
}

function getButtonColors(
  theme: MobileUiTheme,
  variant: ButtonVariant,
  disabled: boolean,
) {
  if (disabled) {
    return {
      backgroundColor: theme.colors.panel,
      borderColor: theme.colors.edgeStrong,
      labelColor: theme.colors.inkMuted,
    };
  }

  switch (variant) {
    case 'secondary':
      return {
        backgroundColor: theme.colors.panelStrong,
        borderColor: theme.colors.edgeStrong,
        labelColor: theme.colors.accentText,
      };
    case 'ghost':
      return {
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        labelColor: theme.colors.accentStrong,
      };
    case 'primary':
    default:
      return {
        backgroundColor: theme.colors.accentStrong,
        borderColor: theme.colors.accentStrong,
        labelColor: theme.colors.panelStrong,
      };
  }
}

export function useMobileUiTheme(): MobileUiTheme {
  return useContext(MobileUiThemeContext);
}

export function MobileUiThemeProvider({
  children,
  theme,
}: {
  children: ReactNode;
  theme: MobileUiTheme;
}) {
  return (
    <MobileUiThemeContext.Provider value={theme}>
      {children}
    </MobileUiThemeContext.Provider>
  );
}

export function AppShell({
  children,
  contentContainerStyle,
  description,
  eyebrow,
  scrollable = true,
  testID,
  themeName,
  title,
}: {
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  description?: string;
  eyebrow?: string;
  scrollable?: boolean;
  testID?: string;
  themeName?: MobileUiThemeName;
  title?: string;
}) {
  const systemScheme = useColorScheme();
  const theme = resolveTheme(
    themeName ?? (systemScheme === 'dark' ? 'dark' : 'light'),
  );
  const headerVisible = Boolean(eyebrow || title || description);

  const body = (
    <View style={styles.shellBody}>
      {headerVisible ? (
        <View style={styles.shellHeader}>
          {eyebrow ? (
            <Text style={[styles.eyebrow, { color: theme.colors.inkMuted }]}>
              {eyebrow}
            </Text>
          ) : null}
          {title ? (
            <Text style={[styles.heroTitle, { color: theme.colors.ink }]}>
              {title}
            </Text>
          ) : null}
          {description ? (
            <Text
              style={[styles.heroDescription, { color: theme.colors.inkMuted }]}
            >
              {description}
            </Text>
          ) : null}
        </View>
      ) : null}
      {children}
    </View>
  );

  return (
    <MobileUiThemeProvider theme={theme}>
      <SafeAreaView
        edges={['top', 'left', 'right', 'bottom']}
        style={[styles.shellSafeArea, { backgroundColor: theme.colors.canvas }]}
        testID={testID}
      >
        <View
          pointerEvents="none"
          style={[
            styles.shellGlowPrimary,
            { backgroundColor: theme.colors.glowPrimary },
          ]}
        />
        <View
          pointerEvents="none"
          style={[
            styles.shellGlowSecondary,
            { backgroundColor: theme.colors.glowSecondary },
          ]}
        />

        {scrollable ? (
          <ScrollView
            contentContainerStyle={[
              styles.shellScrollContent,
              contentContainerStyle,
            ]}
            showsVerticalScrollIndicator={false}
          >
            {body}
          </ScrollView>
        ) : (
          <View style={[styles.shellScrollContent, contentContainerStyle]}>
            {body}
          </View>
        )}
      </SafeAreaView>
    </MobileUiThemeProvider>
  );
}

export function Card({
  accentColor,
  children,
  style,
  tone = 'default',
}: {
  accentColor?: ColorValue;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  tone?: CardTone;
}) {
  const theme = useMobileUiTheme();

  return (
    <View
      style={[
        styles.card,
        designTokens.elevation.card,
        {
          backgroundColor: getCardBackground(theme, tone),
          borderColor: theme.colors.edge,
        },
        style,
      ]}
    >
      {accentColor ? (
        <View style={[styles.cardAccent, { backgroundColor: accentColor }]} />
      ) : null}
      <View style={styles.cardBody}>{children}</View>
    </View>
  );
}

export function Button({
  accessibilityLabel,
  disabled = false,
  label,
  onPress,
  style,
  variant = 'primary',
}: {
  accessibilityLabel?: string;
  disabled?: boolean;
  label: string;
  onPress: () => void | Promise<void>;
  style?: StyleProp<ViewStyle>;
  variant?: ButtonVariant;
}) {
  const theme = useMobileUiTheme();
  const colors = getButtonColors(theme, variant, disabled);

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: colors.backgroundColor,
          borderColor: colors.borderColor,
          opacity: pressed ? 0.88 : 1,
        },
        variant === 'ghost' ? styles.buttonGhost : styles.buttonBordered,
        style,
      ]}
    >
      <Text style={[styles.buttonLabel, { color: colors.labelColor }]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function ListItem({
  accessibilityLabel,
  children,
  onPress,
  subtitle,
  title,
  trailing,
}: {
  accessibilityLabel?: string;
  children?: ReactNode;
  onPress?: () => void;
  subtitle?: string;
  title: string;
  trailing?: ReactNode;
}) {
  const theme = useMobileUiTheme();
  const content = (
    <>
      <View style={styles.listItemHeader}>
        <View style={styles.listItemCopy}>
          <Text style={[styles.listItemTitle, { color: theme.colors.ink }]}>
            {title}
          </Text>
          {subtitle ? (
            <Text
              style={[
                styles.listItemSubtitle,
                { color: theme.colors.inkMuted },
              ]}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
        {trailing ? (
          <View style={styles.listItemTrailing}>{trailing}</View>
        ) : null}
      </View>
      {children ? <View style={styles.listItemBody}>{children}</View> : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityLabel={accessibilityLabel ?? title}
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [
          styles.listItem,
          designTokens.elevation.card,
          {
            backgroundColor: theme.colors.panelStrong,
            borderColor: theme.colors.edge,
            opacity: pressed ? 0.94 : 1,
          },
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View
      style={[
        styles.listItem,
        designTokens.elevation.card,
        {
          backgroundColor: theme.colors.panelStrong,
          borderColor: theme.colors.edge,
        },
      ]}
    >
      {content}
    </View>
  );
}

export function BottomSheet({
  children,
  onDismiss,
  visible = true,
}: {
  children: ReactNode;
  onDismiss?: () => void;
  visible?: boolean;
}) {
  const theme = useMobileUiTheme();

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.bottomSheetScene}>
      <Pressable
        accessibilityLabel="Dismiss bottom sheet"
        accessibilityRole="button"
        onPress={onDismiss}
        style={[
          styles.bottomSheetBackdrop,
          { backgroundColor: theme.colors.overlay },
        ]}
      />
      <View
        style={[
          styles.bottomSheetCard,
          designTokens.elevation.sheet,
          {
            backgroundColor: theme.colors.panelStrong,
            borderColor: theme.colors.edge,
          },
        ]}
      >
        <View
          style={[
            styles.bottomSheetHandle,
            { backgroundColor: theme.colors.edgeStrong },
          ]}
        />
        {children}
      </View>
    </View>
  );
}

export function TextField({
  autoCapitalize = 'none',
  helperText,
  keyboardType,
  label,
  multiline = false,
  onChangeText,
  placeholder,
  value,
}: {
  autoCapitalize?: TextInputProps['autoCapitalize'];
  helperText?: string;
  keyboardType?: KeyboardTypeOptions;
  label?: string;
  multiline?: boolean;
  onChangeText: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  const theme = useMobileUiTheme();

  return (
    <View style={styles.textFieldStack}>
      {label ? (
        <Text style={[styles.fieldLabel, { color: theme.colors.ink }]}>
          {label}
        </Text>
      ) : null}
      <TextInput
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        multiline={multiline}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.inkMuted}
        style={[
          styles.textField,
          {
            backgroundColor: theme.colors.panel,
            borderColor: theme.colors.edgeStrong,
            color: theme.colors.ink,
            textAlignVertical: multiline ? 'top' : 'center',
          },
        ]}
        value={value}
      />
      {helperText ? (
        <Text style={[styles.helperText, { color: theme.colors.inkMuted }]}>
          {helperText}
        </Text>
      ) : null}
    </View>
  );
}

export function Chip({
  accessibilityLabel,
  label,
  onPress,
  selected = false,
  tone = 'default',
}: {
  accessibilityLabel?: string;
  label: string;
  onPress?: () => void;
  selected?: boolean;
  tone?: ChipTone;
}) {
  const theme = useMobileUiTheme();
  const colors = getChipColors(theme, tone, selected);

  if (onPress) {
    return (
      <Pressable
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [
          styles.chip,
          {
            backgroundColor: colors.backgroundColor,
            borderColor: colors.borderColor,
            opacity: pressed ? 0.92 : 1,
          },
        ]}
      >
        <Text style={[styles.chipLabel, { color: colors.labelColor }]}>
          {label}
        </Text>
      </Pressable>
    );
  }

  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: colors.backgroundColor,
          borderColor: colors.borderColor,
        },
      ]}
    >
      <Text style={[styles.chipLabel, { color: colors.labelColor }]}>
        {label}
      </Text>
    </View>
  );
}

export function EmptyState({
  actions,
  description,
  title,
}: {
  actions?: ReactNode;
  description: string;
  title: string;
}) {
  const theme = useMobileUiTheme();

  return (
    <Card tone="positive">
      <View style={styles.emptyState}>
        <Text style={[styles.listItemTitle, { color: theme.colors.ink }]}>
          {title}
        </Text>
        <Text
          style={[styles.listItemSubtitle, { color: theme.colors.inkMuted }]}
        >
          {description}
        </Text>
        {actions ? (
          <View style={styles.emptyStateActions}>{actions}</View>
        ) : null}
      </View>
    </Card>
  );
}

export function SectionHeader({
  description,
  eyebrow,
  title,
}: {
  description?: string;
  eyebrow?: string;
  title: string;
}) {
  const theme = useMobileUiTheme();

  return (
    <View style={styles.sectionHeader}>
      {eyebrow ? (
        <Text style={[styles.eyebrow, { color: theme.colors.inkMuted }]}>
          {eyebrow}
        </Text>
      ) : null}
      <Text style={[styles.sectionTitle, { color: theme.colors.ink }]}>
        {title}
      </Text>
      {description ? (
        <Text
          style={[styles.sectionDescription, { color: theme.colors.inkMuted }]}
        >
          {description}
        </Text>
      ) : null}
    </View>
  );
}

export function KPIBlock({
  caption,
  label,
  value,
}: {
  caption?: string;
  label: string;
  value: string;
}) {
  const theme = useMobileUiTheme();

  return (
    <Card style={styles.kpiBlock}>
      <Text style={[styles.kpiLabel, { color: theme.colors.inkMuted }]}>
        {label}
      </Text>
      <Text style={[styles.kpiValue, { color: theme.colors.ink }]}>
        {value}
      </Text>
      {caption ? (
        <Text style={[styles.helperText, { color: theme.colors.inkMuted }]}>
          {caption}
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  bottomSheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  bottomSheetCard: {
    borderRadius: designTokens.radius.xl,
    borderWidth: 1,
    maxHeight: '88%',
    overflow: 'hidden',
    paddingBottom: designTokens.spacing.lg,
  },
  bottomSheetHandle: {
    alignSelf: 'center',
    borderRadius: designTokens.radius.pill,
    height: 6,
    marginTop: designTokens.spacing.sm,
    width: 64,
  },
  bottomSheetScene: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: designTokens.spacing.lg,
    position: 'relative',
  },
  button: {
    alignItems: 'center',
    borderRadius: designTokens.radius.md,
    justifyContent: 'center',
    minHeight: 52,
    minWidth: designTokens.touch.minTarget,
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.sm,
  },
  buttonBordered: {
    borderWidth: 1,
  },
  buttonGhost: {
    borderWidth: 0,
    paddingHorizontal: 0,
  },
  buttonLabel: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
    textAlign: 'center',
  },
  card: {
    borderRadius: designTokens.radius.xl,
    borderWidth: 1,
    gap: designTokens.spacing.md,
    padding: designTokens.spacing.lg,
  },
  cardAccent: {
    borderRadius: designTokens.radius.md,
    height: 76,
    width: 76,
  },
  cardBody: {
    flex: 1,
    gap: designTokens.spacing.sm,
  },
  chip: {
    alignItems: 'center',
    borderRadius: designTokens.radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: designTokens.touch.minTarget,
    minWidth: designTokens.touch.minTarget,
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.sm,
  },
  chipLabel: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  emptyState: {
    gap: designTokens.spacing.sm,
  },
  emptyStateActions: {
    gap: designTokens.spacing.sm,
    marginTop: designTokens.spacing.xs,
  },
  eyebrow: {
    fontSize: designTokens.typography.eyebrow.fontSize,
    fontWeight: designTokens.typography.eyebrow.fontWeight,
    letterSpacing: designTokens.typography.eyebrow.letterSpacing,
    lineHeight: designTokens.typography.eyebrow.lineHeight,
    textTransform: designTokens.typography.eyebrow.textTransform,
  },
  fieldLabel: {
    fontSize: designTokens.typography.fieldLabel.fontSize,
    fontWeight: designTokens.typography.fieldLabel.fontWeight,
    lineHeight: designTokens.typography.fieldLabel.lineHeight,
  },
  helperText: {
    fontSize: designTokens.typography.caption.fontSize,
    fontWeight: designTokens.typography.caption.fontWeight,
    lineHeight: designTokens.typography.caption.lineHeight,
  },
  heroDescription: {
    fontSize: designTokens.typography.subtitle.fontSize,
    fontWeight: designTokens.typography.subtitle.fontWeight,
    lineHeight: designTokens.typography.subtitle.lineHeight,
    maxWidth: 620,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: '800',
    lineHeight: 42,
  },
  kpiBlock: {
    minHeight: 124,
  },
  kpiLabel: {
    fontSize: designTokens.typography.kpiLabel.fontSize,
    fontWeight: designTokens.typography.kpiLabel.fontWeight,
    letterSpacing: designTokens.typography.kpiLabel.letterSpacing,
    lineHeight: designTokens.typography.kpiLabel.lineHeight,
    textTransform: designTokens.typography.kpiLabel.textTransform,
  },
  kpiValue: {
    fontSize: designTokens.typography.kpiValue.fontSize,
    fontWeight: designTokens.typography.kpiValue.fontWeight,
    lineHeight: designTokens.typography.kpiValue.lineHeight,
  },
  listItem: {
    borderRadius: designTokens.radius.lg,
    borderWidth: 1,
    gap: designTokens.spacing.sm,
    minHeight: 96,
    padding: designTokens.spacing.lg,
  },
  listItemBody: {
    gap: designTokens.spacing.sm,
  },
  listItemCopy: {
    flex: 1,
    gap: designTokens.spacing.xxs,
  },
  listItemHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: designTokens.spacing.sm,
    justifyContent: 'space-between',
  },
  listItemSubtitle: {
    fontSize: designTokens.typography.caption.fontSize,
    fontWeight: designTokens.typography.caption.fontWeight,
    lineHeight: designTokens.typography.caption.lineHeight,
  },
  listItemTitle: {
    fontSize: designTokens.typography.title.fontSize,
    fontWeight: designTokens.typography.title.fontWeight,
    lineHeight: designTokens.typography.title.lineHeight,
  },
  listItemTrailing: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  sectionDescription: {
    fontSize: designTokens.typography.body.fontSize,
    fontWeight: designTokens.typography.body.fontWeight,
    lineHeight: designTokens.typography.body.lineHeight,
  },
  sectionHeader: {
    gap: designTokens.spacing.xs,
  },
  sectionTitle: {
    fontSize: designTokens.typography.sectionTitle.fontSize,
    fontWeight: designTokens.typography.sectionTitle.fontWeight,
    lineHeight: designTokens.typography.sectionTitle.lineHeight,
  },
  shellBody: {
    gap: designTokens.spacing.lg,
  },
  shellGlowPrimary: {
    borderRadius: 180,
    height: 240,
    left: -60,
    position: 'absolute',
    top: -40,
    width: 240,
  },
  shellGlowSecondary: {
    borderRadius: 220,
    height: 280,
    position: 'absolute',
    right: -90,
    top: 120,
    width: 280,
  },
  shellHeader: {
    gap: designTokens.spacing.sm,
  },
  shellSafeArea: {
    flex: 1,
  },
  shellScrollContent: {
    paddingBottom: 40,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  textField: {
    borderRadius: designTokens.radius.md,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 56,
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: 14,
  },
  textFieldStack: {
    gap: designTokens.spacing.xs,
  },
});
