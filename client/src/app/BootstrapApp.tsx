import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

import { BootstrapCard } from '../components/BootstrapCard';
import { APP_COPY } from '../lib/app-info';
import { colors } from '../theme/colors';

export function BootstrapApp() {
  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.content}>
        <Text style={styles.eyebrow}>{APP_COPY.stage}</Text>
        <Text style={styles.title}>{APP_COPY.title}</Text>
        <Text style={styles.subtitle}>{APP_COPY.subtitle}</Text>
        <BootstrapCard />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
    paddingHorizontal: 24,
    width: '100%',
  },
  eyebrow: {
    color: colors.inkMuted,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  screen: {
    alignItems: 'center',
    backgroundColor: colors.canvas,
    flex: 1,
    justifyContent: 'center',
  },
  subtitle: {
    color: colors.inkMuted,
    fontSize: 16,
    lineHeight: 24,
  },
  title: {
    color: colors.ink,
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 40,
  },
});
