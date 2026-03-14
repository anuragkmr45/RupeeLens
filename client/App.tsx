import { DesignSystemShowcaseScreen } from './src/app/DesignSystemShowcaseScreen';
import { AppThemeProvider } from './src/theme';

export default function App() {
  return (
    <AppThemeProvider>
      <DesignSystemShowcaseScreen />
    </AppThemeProvider>
  );
}
