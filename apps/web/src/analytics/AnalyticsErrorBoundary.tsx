import { Component, type ErrorInfo, type PropsWithChildren } from 'react';
import { Button, SectionHeading, Text } from '@leanlog/ui';

type State = { hasError: boolean };

export class AnalyticsErrorBoundary extends Component<PropsWithChildren, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    try {
      import('posthog-js').then((ph) => {
        ph.default.capture('$exception', {
          $exception_message: error.message,
          $exception_type: error.name,
          $exception_source: 'react_error_boundary',
          $exception_stack_trace_raw: error.stack,
          $exception_componentStack: info.componentStack,
        });
      });
    } catch {
      // PostHog unavailable — already logged at init
    }
    console.error('[leanlog] Unhandled React error', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center"
        >
          <SectionHeading>Something went wrong</SectionHeading>
          <Text as="p" variant="meta">
            An unexpected error occurred.
          </Text>
          <Button onClick={() => window.location.reload()}>Refresh page</Button>
        </div>
      );
    }
    return this.props.children;
  }
}
