import { useUser } from '@clerk/clerk-react';
import posthog from 'posthog-js';
import { useEffect } from 'react';

export function usePostHogIdentify() {
  const { isSignedIn, user } = useUser();

  useEffect(() => {
    if (isSignedIn === undefined) return;
    try {
      if (isSignedIn && user) {
        posthog.identify(user.id, {
          email: user.primaryEmailAddress?.emailAddress,
          name: user.fullName,
        });
      } else {
        posthog.reset();
      }
    } catch {
      // PostHog unavailable — fail silently
    }
  }, [isSignedIn, user]);
}
