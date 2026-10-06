import { useState } from 'react';

// Runs a store action and keeps its outcome for the screen to show: the failure
// (a locked day, a validation error) or a "Saved" confirmation, instead of
// letting a rejection go unhandled.
export function useRunAction() {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const run = async (action: () => Promise<unknown>): Promise<boolean> => {
    setSaved(false);
    try {
      await action();
      setError(null);
      setSaved(true);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    }
  };
  return { error, saved, run };
}
