import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '../ui/atoms/Button';
import { Card } from '../ui/atoms/Card';
import { Screen } from '../ui/atoms/Screen';
import { Text } from '../ui/atoms/Text';

type Props = {
  // Called once per caught error, e.g. to write the local log and report it.
  onError: (error: Error, info: ErrorInfo) => void;
  children: ReactNode;
};

type State = { failed: boolean };

// Catches render errors anywhere below it and offers a retry instead of a blank
// screen. React only supports error boundaries as classes.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError(error, info);
  }

  render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <Screen>
        <Card title="Something went wrong">
          <Text variant="helper">
            Leanlog hit an unexpected problem. Your data is safe on this phone.
          </Text>
          <Button label="Try again" onPress={() => this.setState({ failed: false })} />
        </Card>
      </Screen>
    );
  }
}
