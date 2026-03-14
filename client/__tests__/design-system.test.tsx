import { fireEvent, render } from '@testing-library/react-native';
import type { PropsWithChildren } from 'react';
import { Text, View } from 'react-native';

import { DesignSystemShowcaseScreen } from '../src/app/DesignSystemShowcaseScreen';
import { BottomSheet } from '../src/components/BottomSheet';
import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { Chip } from '../src/components/Chip';
import { EmptyState } from '../src/components/EmptyState';
import { KPIBlock } from '../src/components/KPIBlock';
import { ListItem } from '../src/components/ListItem';
import { SectionHeader } from '../src/components/SectionHeader';
import { TextField } from '../src/components/TextField';
import { AppThemeProvider, type ThemePreference } from '../src/theme';

function ThemeWrapper({
  children,
  initialPreference,
}: PropsWithChildren<{ initialPreference: ThemePreference }>) {
  return (
    <AppThemeProvider initialPreference={initialPreference}>
      {children}
    </AppThemeProvider>
  );
}

function PrimitivePreview() {
  return (
    <View style={{ gap: 12 }}>
      <Card
        footer={<Button variant="ghost">Ghost action</Button>}
        header={
          <SectionHeader
            eyebrow="Preview"
            subtitle="Representative primitive snapshot"
            title="Primitive Gallery"
          />
        }
      >
        <KPIBlock label="Total" supportingText="Shared metric block" value="₹420" />
        <TextField
          helperText="Helper text"
          label="Merchant"
          onChangeText={() => undefined}
          value="Third Wave Coffee"
        />
        <Chip label="Coffee" selected />
        <ListItem
          detail="Suggested category: Coffee"
          subtitle="Inbox · just now"
          title="Third Wave Coffee"
          trailing={<Text>₹420</Text>}
        />
        <EmptyState
          action={<Button variant="secondary">Add manual</Button>}
          description="No transactions left to classify."
          title="All clear"
        />
      </Card>
      <BottomSheet isOpen onClose={() => undefined} title="Open sheet">
        <Text>Sheet content</Text>
      </BottomSheet>
    </View>
  );
}

describe('design system primitives', () => {
  it('matches the light snapshot', () => {
    const screen = render(
      <ThemeWrapper initialPreference="light">
        <PrimitivePreview />
      </ThemeWrapper>,
    );

    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('matches the dark snapshot', () => {
    const screen = render(
      <ThemeWrapper initialPreference="dark">
        <PrimitivePreview />
      </ThemeWrapper>,
    );

    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('opens the controlled bottom sheet from the showcase screen', () => {
    const screen = render(
      <ThemeWrapper initialPreference="light">
        <DesignSystemShowcaseScreen />
      </ThemeWrapper>,
    );

    expect(screen.queryByText('Quick classify preview')).toBeNull();

    fireEvent.press(screen.getByText('Preview Bottom Sheet'));

    expect(screen.getByText('Quick classify preview')).toBeTruthy();
    expect(screen.getByText('Captured from notification · just now')).toBeTruthy();
  });
});
