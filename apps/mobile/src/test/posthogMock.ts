// Stand-in for posthog-react-native in jest: records every client the app creates.
export const instances: PostHog[] = [];

// Reached as the whole module via jest.requireActual in setup.ts, which static analysis can't see.
// react-doctor-disable-next-line deslop/unused-export
export class PostHog {
  readonly apiKey: string;
  readonly options: Record<string, unknown>;
  capture = jest.fn();
  captureException = jest.fn();
  optOut = jest.fn();
  reset = jest.fn();

  constructor(apiKey: string, options: Record<string, unknown> = {}) {
    this.apiKey = apiKey;
    this.options = options;
    instances.push(this);
  }
}
