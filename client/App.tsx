import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { DesignSystemShowcaseScreen } from './src/app/DesignSystemShowcaseScreen';
import { AppShell } from './src/components/AppShell';
import { Button } from './src/components/Button';
import { Card } from './src/components/Card';
import { SectionHeader } from './src/components/SectionHeader';
import { ensureAppDatabaseReady } from './src/lib/db';
import { AppThemeProvider, useAppTheme } from './src/theme';

type BootstrapState = 'error' | 'loading' | 'ready';

function DatabaseBootstrapBoundary() {
  const { theme, tokens } = useAppTheme();
  const [state, setState] = useState<BootstrapState>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let isActive = true;

    setState('loading');
    setErrorMessage(null);

    void ensureAppDatabaseReady()
      .then(() => {
        if (!isActive) {
          return;
        }

        setState('ready');
      })
      .catch((error: unknown) => {
        if (!isActive) {
          return;
        }

        setState('error');
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Unknown database bootstrap error.',
        );
      });

    return () => {
      isActive = false;
    };
  }, [attempt]);

  const styles = StyleSheet.create({
    bodyText: {
      color: theme.colors.textSecondary,
      fontFamily: tokens.typography.fontFamily.body,
      fontSize: tokens.typography.fontSize.body,
      lineHeight: tokens.typography.lineHeight.body,
    },
    stack: {
      gap: tokens.spacing.lg,
    },
  });

  if (state === 'ready') {
    return <DesignSystemShowcaseScreen />;
  }

  return (
    <AppShell scrollable={false} testID="database-bootstrap-state">
      <Card
        header={
          <SectionHeader
            eyebrow="SET-004"
            subtitle="The local app-domain SQLite schema is applied before the client renders its main surface."
            title={
              state === 'loading'
                ? 'Preparing local database'
                : 'Local database unavailable'
            }
          />
        }
      >
        <View style={styles.stack}>
          <Text style={styles.bodyText}>
            {state === 'loading'
              ? 'Applying the app-domain migration and seed manifests.'
              : errorMessage ??
                'The app could not initialize the local database from migrations.'}
          </Text>
          {state === 'error' ? (
            <Button onPress={() => setAttempt((currentAttempt) => currentAttempt + 1)}>
              Retry bootstrap
            </Button>
          ) : null}
        </View>
      </Card>
    </AppShell>
  );
}

export default function App() {
  return (
    <AppThemeProvider>
      <DatabaseBootstrapBoundary />
    </AppThemeProvider>
  );
}
