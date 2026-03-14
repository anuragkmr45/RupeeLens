import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';

export function BootstrapCard() {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>Scaffold status</Text>
      <Text style={styles.value}>Client, API, worker, and shared packages are wired.</Text>
      <Text style={styles.note}>Feature screens, data capture, and sync arrive in later tickets.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.panel,
    borderColor: colors.edge,
    borderRadius: 24,
    borderWidth: 1,
    gap: 12,
    padding: 20,
  },
  label: {
    color: colors.inkMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  note: {
    color: colors.inkMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  value: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 28,
  },
});
