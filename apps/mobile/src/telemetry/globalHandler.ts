type Handler = (error: Error, isFatal?: boolean) => void;
type ErrorUtilsLike = { getGlobalHandler(): Handler; setGlobalHandler(handler: Handler): void };

// Report uncaught JS errors, then hand them to the handler that was there before
// (React Native's red box / crash). Returns a function that restores it.
export function installGlobalErrorHandler(report: (error: Error) => void): () => void {
  const utils = (globalThis as { ErrorUtils?: ErrorUtilsLike }).ErrorUtils;
  if (!utils) return () => undefined;
  const previous = utils.getGlobalHandler();
  utils.setGlobalHandler((error, isFatal) => {
    try {
      report(error);
    } catch {
      // Reporting must never hide the original crash.
    }
    previous(error, isFatal);
  });
  return () => utils.setGlobalHandler(previous);
}
