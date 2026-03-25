import { fireEvent, render, waitFor } from '@testing-library/react-native';

import App from '../App';
import { seededTransactions } from '../src/features/spend-tracker/domain';
import {
  loadStoredSpendTrackerState,
  saveStoredSpendTrackerState,
} from '../src/features/spend-tracker/persistence';

jest.mock('../src/features/spend-tracker/persistence', () => ({
  clearStoredSpendTrackerState: jest.fn().mockResolvedValue(undefined),
  loadStoredSpendTrackerState: jest.fn().mockResolvedValue(null),
  saveStoredSpendTrackerState: jest.fn().mockResolvedValue(undefined),
}));

const mockedLoadStoredSpendTrackerState =
  loadStoredSpendTrackerState as jest.MockedFunction<typeof loadStoredSpendTrackerState>;
const mockedSaveStoredSpendTrackerState =
  saveStoredSpendTrackerState as jest.MockedFunction<typeof saveStoredSpendTrackerState>;

describe('App', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedLoadStoredSpendTrackerState.mockResolvedValue(null);
    mockedSaveStoredSpendTrackerState.mockResolvedValue(undefined);
  });

  it('shows the hydration screen before onboarding resumes', async () => {
    const screen = render(<App />);

    expect(screen.getByText('UPI Spend Tracker')).toBeTruthy();
    expect(screen.getByText('Restoring saved state on this device')).toBeTruthy();
    expect(await screen.findByText('Continue in local-only mode')).toBeTruthy();
  });

  it('hydrates a previously completed local session', async () => {
    mockedLoadStoredSpendTrackerState.mockResolvedValue({
      notificationAccessState: 'settings_opened',
      onboardingCompleted: true,
      transactions: seededTransactions.map((transaction) =>
        transaction.id === 'txn_blue_tokai'
          ? {
              ...transaction,
              items: [
                {
                  amountMinor: transaction.amountMinor,
                  categoryId: 'food_drink',
                  id: 'txn_blue_tokai_item_1',
                  label: 'Cold brew',
                },
              ],
              status: 'classified',
            }
          : transaction,
      ),
    });

    const screen = render(<App />);

    expect(await screen.findByText('Current cycle at a glance')).toBeTruthy();
    expect(screen.getByText('1 pending')).toBeTruthy();
    expect(screen.getByText('Notification settings opened')).toBeTruthy();
  });

  it('classifies an inbox item and persists the updated session', async () => {
    const screen = render(<App />);

    fireEvent.press(await screen.findByText('Continue in local-only mode'));

    expect(await screen.findByText('Current cycle at a glance')).toBeTruthy();
    expect(screen.getByText('Rs 1,775')).toBeTruthy();
    expect(screen.getByText('2 pending')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Inbox' }));

    expect(screen.getByText('Classify what you skipped')).toBeTruthy();
    expect(screen.getByText('Blue Tokai Roasters')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Classify Blue Tokai Roasters' }));
    fireEvent.changeText(screen.getByPlaceholderText('What did you buy?'), 'Cold brew');
    fireEvent.press(screen.getByRole('button', { name: 'Food & Drink' }));
    fireEvent.press(screen.getByRole('button', { name: 'Save classification' }));

    expect(screen.queryByText('Blue Tokai Roasters')).toBeNull();
    expect(screen.getByText('Blinkit')).toBeTruthy();

    await waitFor(() =>
      expect(mockedSaveStoredSpendTrackerState).toHaveBeenLastCalledWith(
        expect.objectContaining({
          notificationAccessState: 'not_started',
          onboardingCompleted: true,
          transactions: expect.arrayContaining([
            expect.objectContaining({
              id: 'txn_blue_tokai',
              items: [
                expect.objectContaining({
                  categoryId: 'food_drink',
                  label: 'Cold brew',
                }),
              ],
              status: 'classified',
            }),
          ]),
        }),
      ),
    );
  });

  it('adds a manual spend and persists the updated session', async () => {
    const screen = render(<App />);

    fireEvent.press(await screen.findByText('Continue in local-only mode'));

    expect(await screen.findByText('Current cycle at a glance')).toBeTruthy();
    fireEvent.press(screen.getAllByRole('button', { name: 'Add manual spend' })[0]);

    expect(
      await screen.findByText('Capture a spend even without a notification'),
    ).toBeTruthy();

    fireEvent.changeText(screen.getByPlaceholderText('180 or 180.50'), '299');
    fireEvent.changeText(screen.getByPlaceholderText('Where did you spend?'), 'Corner Store');
    fireEvent.changeText(screen.getByPlaceholderText('What did you buy?'), 'Snacks');
    fireEvent.press(screen.getByRole('button', { name: 'Groceries' }));
    fireEvent.press(screen.getByRole('button', { name: 'Save manual spend' }));

    expect(await screen.findByText('Current cycle at a glance')).toBeTruthy();
    expect(screen.getByText('Rs 2,074')).toBeTruthy();

    await waitFor(() =>
      expect(mockedSaveStoredSpendTrackerState).toHaveBeenLastCalledWith(
        expect.objectContaining({
          onboardingCompleted: true,
          transactions: expect.arrayContaining([
            expect.objectContaining({
              merchant: 'Corner Store',
              sourceApp: 'Manual entry',
              status: 'classified',
              items: [
                expect.objectContaining({
                  categoryId: 'groceries',
                  label: 'Snacks',
                }),
              ],
            }),
          ]),
        }),
      ),
    );
  });
});
