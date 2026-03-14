import type { ParserAssignment } from '@upi-spend-tracker/contracts';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react';

import type { BootstrapRuntimeMetadata } from './runtime';
import {
  refreshBootstrapConfigState,
  type FetchLike,
} from './service';
import type { BootstrapConfigState } from './state';

interface BootstrapConfigContextValue extends BootstrapConfigState {
  isFeatureEnabled: (flagKey: string) => boolean;
  isParserEnabled: (parserId: string) => boolean;
}

const BootstrapConfigContext = createContext<BootstrapConfigContextValue | null>(
  null,
);

function isParserAssignmentEnabled(
  assignment: ParserAssignment | undefined,
): boolean {
  return Boolean(assignment?.enabled);
}

export function BootstrapConfigProvider({
  children,
  fetchImplementation,
  initialState,
  runtimeMetadata,
}: PropsWithChildren<{
  fetchImplementation?: FetchLike;
  initialState: BootstrapConfigState;
  runtimeMetadata: BootstrapRuntimeMetadata;
}>) {
  const [state, setState] = useState<BootstrapConfigState>(initialState);

  useEffect(() => {
    let isActive = true;
    const refreshOptions = fetchImplementation
      ? {
          fetchImplementation,
        }
      : undefined;

    void refreshBootstrapConfigState(
      runtimeMetadata,
      initialState,
      refreshOptions,
    ).then((nextState) => {
      if (!isActive) {
        return;
      }

      setState(nextState);
    });

    return () => {
      isActive = false;
    };
  }, [
    fetchImplementation,
    initialState,
    runtimeMetadata.apiBaseUrl,
    runtimeMetadata.appVersion,
    runtimeMetadata.channel,
    runtimeMetadata.platform,
    runtimeMetadata.publicKey,
    runtimeMetadata.runtimeVersion,
  ]);

  return (
    <BootstrapConfigContext.Provider
      value={{
        ...state,
        isFeatureEnabled(flagKey) {
          return Boolean(state.config.featureFlags[flagKey]);
        },
        isParserEnabled(parserId) {
          if (state.config.parserConfig.globalKillSwitch) {
            return false;
          }

          return isParserAssignmentEnabled(
            state.config.parserConfig.parserAssignments[parserId],
          );
        },
      }}
    >
      {children}
    </BootstrapConfigContext.Provider>
  );
}

export function useBootstrapConfig() {
  const context = useContext(BootstrapConfigContext);

  if (!context) {
    throw new Error(
      'useBootstrapConfig must be used within a BootstrapConfigProvider.',
    );
  }

  return context;
}
