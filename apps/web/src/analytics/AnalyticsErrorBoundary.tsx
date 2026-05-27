import { Component, type ErrorInfo, type PropsWithChildren } from 'react';
import { Text } from '@leanlog/ui';

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
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
          <h1 className="text-lg font-semibold">Something went wrong</h1>
          <Text as="p" variant="meta">
            An unexpected error occurred.
          </Text>
          <button
            className="rounded-lg bg-[var(--ll-focus)] px-4 py-2 text-sm font-medium text-white"
            onClick={() => window.location.reload()}
          >
            Refresh page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
