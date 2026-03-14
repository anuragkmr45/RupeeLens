import { AppState } from 'react-native';
import { useEffect, useState } from 'react';

import {
  createDefaultAllowlistState,
  createDefaultCaptureDiagnosticsSummary,
  fallbackSupportedCaptureSources,
} from './defaults';
import { notificationCaptureModule } from './module';
import type { CaptureDiagnosticsState } from './types';

const defaultCaptureDiagnosticsState: CaptureDiagnosticsState = {
  allowlistState: createDefaultAllowlistState(),
  error: null,
  loading: true,
  async openNotificationListenerSettings() {
    return undefined;
  },
  async refresh() {
    return undefined;
  },
  async setAllSourcesEnabled() {
    return undefined;
  },
  async setSourceEnabled() {
    return undefined;
  },
  summary: createDefaultCaptureDiagnosticsSummary(),
  supportedSources: fallbackSupportedCaptureSources,
};

export function useCaptureDiagnostics(): CaptureDiagnosticsState {
  const [supportedSources, setSupportedSources] = useState(
    defaultCaptureDiagnosticsState.supportedSources,
  );
  const [allowlistState, setAllowlistState] = useState(
    defaultCaptureDiagnosticsState.allowlistState,
  );
  const [summary, setSummary] = useState(defaultCaptureDiagnosticsState.summary);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);

    try {
      const [nextSupportedSources, nextAllowlistState, nextSummary] =
        await Promise.all([
          notificationCaptureModule.getSupportedSources(),
          notificationCaptureModule.getAllowlistState(),
          notificationCaptureModule.getDiagnosticsSummary(),
        ]);

      setSupportedSources(nextSupportedSources);
      setAllowlistState(nextAllowlistState);
      setSummary(nextSummary);
      setError(null);
    } catch (refreshError: unknown) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : 'Could not refresh capture diagnostics.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function setSourceEnabled(packageName: string, enabled: boolean) {
    setLoading(true);

    try {
      const nextAllowlistState = await notificationCaptureModule.setSourceEnabled(
        packageName,
        enabled,
      );
      const nextSummary = await notificationCaptureModule.getDiagnosticsSummary();

      setAllowlistState(nextAllowlistState);
      setSummary(nextSummary);
      setError(null);
    } catch (toggleError: unknown) {
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : 'Could not update capture allowlist.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function setAllSourcesEnabled(enabled: boolean) {
    setLoading(true);

    try {
      const nextAllowlistState = await notificationCaptureModule.setAllSourcesEnabled(
        enabled,
      );
      const nextSummary = await notificationCaptureModule.getDiagnosticsSummary();

      setAllowlistState(nextAllowlistState);
      setSummary(nextSummary);
      setError(null);
    } catch (toggleError: unknown) {
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : 'Could not update all capture sources.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function openNotificationListenerSettings() {
    try {
      await notificationCaptureModule.openNotificationListenerSettings();
      setError(null);
    } catch (settingsError: unknown) {
      setError(
        settingsError instanceof Error
          ? settingsError.message
          : 'Could not open notification listener settings.',
      );
    }
  }

  useEffect(() => {
    void refresh();

    const subscription = AppState.addEventListener('change', (appState) => {
      if (appState === 'active') {
        void refresh();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return {
    allowlistState,
    error,
    loading,
    openNotificationListenerSettings,
    refresh,
    setAllSourcesEnabled,
    setSourceEnabled,
    summary,
    supportedSources,
  };
}
