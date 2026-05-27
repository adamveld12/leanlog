import { useUser } from '@clerk/clerk-react';
import posthog from 'posthog-js';
import { useEffect } from 'react';

export function usePostHogIdentify() {
  const { isSignedIn, user } = useUser();

  useEffect(() => {
    if (isSignedIn && user) {
      posthog.identify(user.id, {
        email: user.primaryEmailAddress?.emailAddress,
        name: user.fullName,
      });
    } else {
      posthog.reset();
    }
  }, [isSignedIn, user]);
}
