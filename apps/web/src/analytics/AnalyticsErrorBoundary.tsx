import { Component, type ErrorInfo, type PropsWithChildren } from 'react';
import { ErrorTemplate } from '@leanlog/ui';

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
        <ErrorTemplate
          title="Something went wrong"
          message="An unexpected error occurred. Refresh the page or return home."
          homeHref="/"
          retryLabel="Refresh page"
          onRetry={() => window.location.reload()}
        />
      );
    }
    return this.props.children;
  }
}
