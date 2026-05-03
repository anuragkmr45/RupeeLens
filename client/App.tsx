import {
  SafeAreaProvider,
  initialWindowMetrics,
  type Metrics,
} from 'react-native-safe-area-context';

import { SpendTrackerApp } from './src/app/SpendTrackerApp';

const DEFAULT_SAFE_AREA_METRICS: Metrics = {
  frame: {
    height: 0,
    width: 0,
    x: 0,
    y: 0,
  },
  insets: {
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
  },
};

export default function App() {
  return (
    <SafeAreaProvider
      initialMetrics={initialWindowMetrics ?? DEFAULT_SAFE_AREA_METRICS}
    >
      <SpendTrackerApp />
    </SafeAreaProvider>
  );
}
