import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'LeanLog',
  slug: 'leanlog',
  scheme: 'leanlog',
  version: '0.0.1',
  orientation: 'default',
  userInterfaceStyle: 'automatic',
  android: {
    package: 'app.leanlog.mobile',
    permissions: [
      'android.permission.health.READ_WEIGHT',
      'android.permission.health.WRITE_WEIGHT',
      'android.permission.health.READ_BODY_FAT',
      'android.permission.health.WRITE_BODY_FAT',
      'android.permission.health.READ_HEIGHT',
      'android.permission.health.WRITE_HEIGHT',
      'android.permission.health.WRITE_NUTRITION',
    ],
  },
  plugins: [
    'expo-router',
    'expo-sqlite',
    'react-native-health-connect',
    [
      'expo-build-properties',
      { android: { minSdkVersion: 26, compileSdkVersion: 35, targetSdkVersion: 35 } },
    ],
  ],
  extra: {
    // PostHog ships disabled: with no key the analytics module is a silent no-op.
    posthogKey: process.env.EXPO_PUBLIC_POSTHOG_KEY,
    posthogHost: process.env.EXPO_PUBLIC_POSTHOG_HOST,
  },
};

export default config;
