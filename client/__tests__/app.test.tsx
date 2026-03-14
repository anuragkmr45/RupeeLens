import { render } from '@testing-library/react-native';

import App from '../App';

describe('App', () => {
  it('renders the bootstrap copy', () => {
    const screen = render(<App />);

    expect(screen.getByText('UPI Spend Tracker')).toBeTruthy();
    expect(
      screen.getByText('Client, API, worker, and shared packages are wired.'),
    ).toBeTruthy();
  });
});
