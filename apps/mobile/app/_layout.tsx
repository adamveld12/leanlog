// Must be the first import: uuidv7 needs crypto.getRandomValues, which Hermes lacks.
import 'react-native-get-random-values';
import Constants from 'expo-constants';
import { Stack, usePathname } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { nativeIo } from '../src/backup/nativeIo';
import { now } from '../src/clock';
import { useDatabase } from '../src/db/useDatabase';
import { createHealthConnectService } from '../src/health/HealthConnectService';
import { nativeClient } from '../src/health/nativeClient';
import { MobileStoreProvider, useMobileStore } from '../src/state/MobileStore';
import { isOnboarded } from '../src/state/onboarding';
import {
  captureException,
  configureAnalytics,
  setAnalyticsEnabled,
  track,
} from '../src/telemetry/analytics';
import { ErrorBoundary } from '../src/telemetry/ErrorBoundary';
import { installGlobalErrorHandler } from '../src/telemetry/globalHandler';
import { reportError } from '../src/telemetry/reportError';
import { Text } from '../src/ui/atoms/Text';
import { UnitsProvider } from '../src/ui/units';

// PostHog ships disabled: with no key in the build this configures nothing and
// every analytics call is a no-op. The key is inlined at build time.
const extra = Constants.expoConfig?.extra as
  | { posthogKey?: string; posthogHost?: string }
  | undefined;
configureAnalytics({ key: extra?.posthogKey || undefined, host: extra?.posthogHost || undefined });

// Display units follow the stored setting (storage itself stays lb / in). Until
// the profile is complete only onboarding is reachable; finishing it flips the
// guards and routes to the tabs.
function Navigation() {
  const { state } = useMobileStore();
  const ready = state.status === 'ready';
  const optIn = ready ? state.data.settings.analyticsOptIn : null;

  // Start or stop the analytics client to match the stored choice (also after an import).
  useEffect(() => {
    if (optIn !== null) setAnalyticsEnabled(optIn);
  }, [optIn]);

  const pathname = usePathname();
  useEffect(() => {
    track('$screen', { $screen_name: pathname });
  }, [pathname]);

  if (state.status === 'loading') return null;
  const onboarded = ready && isOnboarded(state.data.profile);
  const units = ready ? state.data.settings.units : 'imperial';

  return (
    <UnitsProvider unitSystem={units}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={!onboarded}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
        <Stack.Protected guard={onboarded}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="meal/[id]" options={{ headerShown: true, title: 'Meal' }} />
          <Stack.Screen name="food/[id]" options={{ headerShown: true, title: 'Food' }} />
          <Stack.Screen name="body-fat" options={{ headerShown: true, title: 'Body fat' }} />
          <Stack.Screen
            name="health-rationale"
            options={{ headerShown: true, title: 'Health Connect' }}
          />
        </Stack.Protected>
      </Stack>
    </UnitsProvider>
  );
}

const OWN_PACKAGE = Constants.expoConfig?.android?.package ?? 'app.leanlog.mobile';

export default function RootLayout() {
  const { db, error } = useDatabase();
  const healthConnect = useMemo(
    () =>
      db ? createHealthConnectService({ client: nativeClient, db, ownPackage: OWN_PACKAGE }) : null,
    [db],
  );

  // Uncaught JS errors go to the local error log (and to analytics if opted in).
  useEffect(
    () => (db ? installGlobalErrorHandler((e) => void reportError(db, 'uncaught', e)) : undefined),
    [db],
  );
  // A failed migration leaves no usable database to log to; report it if we can.
  useEffect(() => {
    if (error) captureException(error, { source: 'migration' });
  }, [error]);

  // Placeholder error surface until the mobile UI kit lands (milestone C).
  if (error) return <Text>Couldn't open the database: {error.message}</Text>;
  if (!db) return null;
  return (
    <ErrorBoundary onError={(e) => void reportError(db, 'render', e)}>
      <MobileStoreProvider
        db={db}
        clock={now}
        healthConnect={healthConnect ?? undefined}
        backupIo={nativeIo}
      >
        <Navigation />
      </MobileStoreProvider>
    </ErrorBoundary>
  );
}
