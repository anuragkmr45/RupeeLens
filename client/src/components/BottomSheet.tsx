import type { PropsWithChildren, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAppTheme } from '../theme';

type BottomSheetProps = PropsWithChildren<{
  footer?: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  testID?: string;
  title?: string;
}>;

export function BottomSheet({
  children,
  footer,
  isOpen,
  onClose,
  testID,
  title,
}: BottomSheetProps) {
  const { theme, tokens } = useAppTheme();
  const opacity = useRef(new Animated.Value(isOpen ? 1 : 0)).current;
  const translateY = useRef(new Animated.Value(isOpen ? 0 : 36)).current;
  const [isMounted, setIsMounted] = useState(isOpen);

  useEffect(() => {
    const animation = Animated.parallel([
      Animated.timing(opacity, {
        duration: tokens.motion.duration.sheet,
        toValue: isOpen ? 1 : 0,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        duration: tokens.motion.duration.sheet,
        toValue: isOpen ? 0 : 36,
        useNativeDriver: true,
      }),
    ]);

    if (isOpen) {
      setIsMounted(true);
      animation.start();
      return;
    }

    if (!isMounted) {
      return;
    }

    animation.start(({ finished }) => {
      if (finished) {
        setIsMounted(false);
      }
    });
  }, [
    isMounted,
    isOpen,
    opacity,
    tokens.motion.duration.sheet,
    translateY,
  ]);

  if (!isMounted) {
    return null;
  }

  const styles = StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.colors.backdrop,
    },
    handle: {
      alignSelf: 'center',
      backgroundColor: theme.colors.borderStrong,
      borderRadius: tokens.radii.pill,
      height: 4,
      marginBottom: tokens.spacing.md,
      width: 56,
    },
    host: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    root: {
      flex: 1,
    },
    sheet: {
      backgroundColor: theme.colors.surfaceRaised,
      borderColor: theme.colors.border,
      borderTopLeftRadius: tokens.radii.xl,
      borderTopRightRadius: tokens.radii.xl,
      borderWidth: 1,
      gap: tokens.spacing.md,
      paddingHorizontal: tokens.spacing.lg,
      paddingTop: tokens.spacing.md,
      paddingBottom: tokens.spacing.xl,
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
    <Modal
      animationType="none"
      onRequestClose={onClose}
      transparent
      visible
    >
      <View style={styles.root}>
        <Animated.View pointerEvents="none" style={[styles.backdrop, { opacity }]} />
        <Pressable
          accessibilityRole="button"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.host}>
          <Animated.View
            style={[
              styles.sheet,
              tokens.elevation.sheet,
              {
                transform: [{ translateY }],
              },
            ]}
            testID={testID}
          >
            <View style={styles.handle} />
            {title ? <Text style={styles.title}>{title}</Text> : null}
            <View>{children}</View>
            {footer ? <View>{footer}</View> : null}
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}
