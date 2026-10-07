import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from '../ui/atoms/Text';
import { ErrorBoundary } from './ErrorBoundary';

let shouldThrow = true;
function Bomb() {
  if (shouldThrow) throw new Error('render failed');
  return <Text>All good</Text>;
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    shouldThrow = true;
    // React logs caught render errors; keep the test output clean.
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it('shows a recoverable message and reports the error', async () => {
    const onError = jest.fn();
    await render(
      <ErrorBoundary onError={onError}>
        <Bomb />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Something went wrong')).toBeTruthy();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);

    shouldThrow = false;
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.getByText('All good')).toBeTruthy();
  });

  it('renders children untouched when nothing fails', async () => {
    shouldThrow = false;
    await render(
      <ErrorBoundary onError={jest.fn()}>
        <Bomb />
      </ErrorBoundary>,
    );
    expect(screen.getByText('All good')).toBeTruthy();
  });
});
