import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { api } from '../../api';

// Resolves a private progress-photo key to a displayable object URL (#69).
//
// Body photos are served only through the authenticated proxy, so they can't be
// dropped straight into an <img src> (the browser won't attach the bearer token).
// This hook fetches the bytes with the token and hands back a blob: URL, revoking
// it on cleanup / key change. Returns null while loading, on error, or for no key.
export function useProgressPhotoUrl(key: string | null | undefined): string | null {
  const { getToken } = useAuth();
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    void (async () => {
      if (!key) {
        if (!cancelled) setUrl(null);
        return;
      }
      try {
        const token = await getToken();
        if (!token || cancelled) return;
        const blob = await api.progressPhotos.fetchBlob(token, key);
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      } catch {
        if (!cancelled) setUrl(null);
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [key, getToken]);

  return url;
}
