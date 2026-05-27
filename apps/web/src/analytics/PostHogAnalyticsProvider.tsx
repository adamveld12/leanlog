import posthog from 'posthog-js';
import { AnalyticsProvider } from '@leanlog/ui';
import type { TrackUiEvent } from '@leanlog/ui';
import type { PropsWithChildren } from 'react';
import { usePostHogIdentify } from './usePostHogIdentify';

const token = import.meta.env.VITE_POSTHOG_TOKEN as string | undefined;
const host = import.meta.env.VITE_POSTHOG_HOST as string | undefined;

if (token && host) {
  posthog.init(token, {
    api_host: host,
    defaults: '2026-01-30',
    person_profiles: 'identified_only',
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: true,
  });
}

const track: TrackUiEvent = (eventName, properties) => {
  if (import.meta.env.DEV) {
    console.info('[leanlog analytics]', eventName, properties ?? {});
  }
  if (token) {
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
      {token && <PostHogIdentifier />}
      {children}
    </AnalyticsProvider>
  );
}
