import type { Snapshot } from './selectors';

export type State =
  | { status: 'loading' }
  | { status: 'ready'; today: string; data: Snapshot }
  | { status: 'error'; message: string };

export type Action =
  | { type: 'loaded'; today: string; data: Snapshot }
  | { type: 'failed'; message: string };

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'loaded':
      return { status: 'ready', today: action.today, data: action.data };
    case 'failed':
      return { status: 'error', message: action.message };
    default:
      return state;
  }
}
