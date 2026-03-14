jest.mock('../src/lib/db', () => ({
  ensureAppDatabaseReady: jest.fn().mockResolvedValue({
    latestMigrationId: '0001_initial_client_schema',
    latestSeedId: '0001_default_categories_and_settings',
    manifestHash: 'test-hash',
    seedVersion: '0001_default_categories_and_settings',
  }),
}));

import { render } from '@testing-library/react-native';

import App from '../App';

describe('App', () => {
  it('renders the design system showcase after the database is ready', async () => {
    const screen = render(<App />);

    expect(await screen.findByText('Design System Showcase')).toBeTruthy();
    expect(await screen.findByText('Current cycle')).toBeTruthy();
  });
});
