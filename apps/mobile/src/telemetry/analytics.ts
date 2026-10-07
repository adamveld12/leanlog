import { PostHog } from 'posthog-react-native';

// Opt-in, anonymous product analytics. It ships disabled: with no PostHog key
// configured there is no client, no network traffic and no warnings, and every
// function below does nothing. With a key, nothing is sent until the user turns
// it on in Settings. The client never identifies the user.

type Config = { key?: string; host?: string };

let config: Config = {};
let client: PostHog | null = null;

// Called once at startup with the build-time values (or {} when there is no key).
// Also drops any existing client, so it doubles as a reset.
export function configureAnalytics(next: Config): void {
  client = null;
  config = next;
}

export const analyticsAvailable = (): boolean => Boolean(config.key);

export function setAnalyticsEnabled(on: boolean): void {
  if (!config.key) return;
  try {
    if (on && !client) {
      client = new PostHog(config.key, {
        host: config.host,
        personProfiles: 'never',
        captureAppLifecycleEvents: false,
      });
    } else if (!on && client) {
      client.optOut();
      client.reset();
      client = null;
    }
  } catch {
    // Analytics must never surface a failure.
    client = null;
  }
}

type Props = Record<string, string | number | boolean | string[]>;

export function track(event: string, props?: Props): void {
  try {
    client?.capture(event, props);
  } catch {
    // Never surface analytics failures.
  }
}

export function captureException(error: unknown, props?: Record<string, string | number>): void {
  try {
    client?.captureException(error, props);
  } catch {
    // Never surface analytics failures.
  }
}
