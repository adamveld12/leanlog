import { useState } from 'react';

// Runs a store action and keeps its failure (a locked day, a validation error)
// for the screen to show, instead of letting the rejection go unhandled.
export function useRunAction() {
  const [error, setError] = useState<string | null>(null);
  const run = async (action: () => Promise<unknown>): Promise<boolean> => {
    try {
      await action();
      setError(null);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    }
  };
  return { error, run };
}
