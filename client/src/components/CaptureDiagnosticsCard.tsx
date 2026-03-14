import { StyleSheet, Text, View } from 'react-native';

import { useCaptureDiagnostics } from '../lib/capture';
import { useAppTheme } from '../theme';
import { Button } from './Button';
import { Card } from './Card';
import { Chip } from './Chip';
import { SectionHeader } from './SectionHeader';

function formatSnapshotTimestamp(postedAtMillis: number): string {
  return new Date(postedAtMillis).toISOString();
}

export function CaptureDiagnosticsCard() {
  const { theme, tokens } = useAppTheme();
  const captureDiagnostics = useCaptureDiagnostics();

  const styles = StyleSheet.create({
    bodyText: {
      color: theme.colors.textSecondary,
      fontFamily: tokens.typography.fontFamily.body,
      fontSize: tokens.typography.fontSize.body,
      lineHeight: tokens.typography.lineHeight.body,
    },
    buttonRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: tokens.spacing.sm,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: tokens.spacing.sm,
    },
    helperText: {
      color: theme.colors.textSecondary,
      fontFamily: tokens.typography.fontFamily.body,
      fontSize: tokens.typography.fontSize.caption,
      lineHeight: tokens.typography.lineHeight.caption,
    },
    stack: {
      gap: tokens.spacing.md,
    },
  });

  const lastSnapshot = captureDiagnostics.summary.lastSnapshot;

  return (
    <Card
      footer={
        <Text style={styles.helperText}>
          Ignored unsupported: {captureDiagnostics.summary.recentIgnoredCounts.unsupported}
          . Ignored not allowlisted:{' '}
          {captureDiagnostics.summary.recentIgnoredCounts.notAllowlisted}.
        </Text>
      }
      header={
        <SectionHeader
          eyebrow="CAP-001"
          subtitle="Temporary diagnostics before the dedicated onboarding and settings flows land."
          title="Capture Diagnostics"
        />
      }
    >
      <View style={styles.stack}>
        <Text style={styles.bodyText}>
          Listener permission: {captureDiagnostics.summary.permissionStatus}.{' '}
          Allowlisted sources: {captureDiagnostics.summary.allowlistedPackages.length}.
        </Text>
        <Text style={styles.bodyText}>
          {lastSnapshot
            ? `Last stored snapshot: ${lastSnapshot.appLabel} (${lastSnapshot.packageName}) at ${formatSnapshotTimestamp(lastSnapshot.postedAtMillis)}.`
            : 'No allowlisted notification stored yet.'}
        </Text>
        {captureDiagnostics.error ? (
          <Text style={styles.bodyText}>
            Diagnostics error: {captureDiagnostics.error}
          </Text>
        ) : null}
        <View style={styles.buttonRow}>
          <Button
            onPress={() => void captureDiagnostics.openNotificationListenerSettings()}
            variant="secondary"
          >
            Open listener settings
          </Button>
          <Button onPress={() => void captureDiagnostics.setAllSourcesEnabled(true)}>
            Select all
          </Button>
          <Button
            onPress={() => void captureDiagnostics.setAllSourcesEnabled(false)}
            variant="ghost"
          >
            Deselect all
          </Button>
          <Button
            onPress={() => void captureDiagnostics.refresh()}
            variant="ghost"
          >
            Refresh diagnostics
          </Button>
        </View>
        <View style={styles.chipRow}>
          {captureDiagnostics.supportedSources.map((source) => (
            <Chip
              key={source.packageName}
              label={source.displayName}
              onPress={() =>
                void captureDiagnostics.setSourceEnabled(
                  source.packageName,
                  !captureDiagnostics.allowlistState[source.packageName],
                )
              }
              selected={Boolean(captureDiagnostics.allowlistState[source.packageName])}
            />
          ))}
        </View>
        {captureDiagnostics.loading ? (
          <Text style={styles.helperText}>Loading capture diagnostics.</Text>
        ) : null}
      </View>
    </Card>
  );
}
