import { render } from '@testing-library/react-native';

import App from '../App';

describe('App', () => {
  it('renders the design system showcase', () => {
    const screen = render(<App />);

    expect(screen.getByText('Design System Showcase')).toBeTruthy();
    expect(screen.getByText('Current cycle')).toBeTruthy();
  });
});
