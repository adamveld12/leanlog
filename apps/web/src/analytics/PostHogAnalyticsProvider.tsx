import posthog from 'posthog-js';
import { AnalyticsProvider } from '@leanlog/ui';
import type { TrackUiEvent } from '@leanlog/ui';
import type { PropsWithChildren } from 'react';
import { usePostHogIdentify } from './usePostHogIdentify';

const token = import.meta.env.VITE_POSTHOG_TOKEN as string | undefined;
const host = import.meta.env.VITE_POSTHOG_HOST as string | undefined;

let posthogReady = false;

if (token && host) {
  try {
    posthog.init(token, {
      api_host: host,
      person_profiles: 'identified_only',
      capture_pageview: true,
      capture_pageleave: true,
      autocapture: true,
    });
    posthogReady = true;
  } catch (error) {
    console.error('[leanlog] PostHog init failed — falling back to console analytics', error);
  }
}

const track: TrackUiEvent = (eventName, properties) => {
  if (import.meta.env.DEV || !posthogReady) {
    console.info('[leanlog analytics]', eventName, properties ?? {});
  }
  if (posthogReady) {
    posthog.capture(eventName, properties ?? {});
  }
};

function PostHogIdentifier() {
  usePostHogIdentify();
  return null;
}

export function PostHogAnalyticsProvider({ children }: PropsWithChildren) {
  return (
    <AnalyticsProvider track={track}>
      {posthogReady && <PostHogIdentifier />}
      {children}
    </AnalyticsProvider>
  );
}
