import {
  createContext,
  useCallback,
  use,
  useEffect,
  useEffectEvent,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';
import { ensureSeeded } from '../db/repos/base';
import { ensureToday } from '../db/repos/targets';
import type { Db } from '../db/types';
import { createActions, type Actions } from './actions';
import { localDate, msUntilNextLocalMidnight } from './date';
import { reducer, type State } from './reducer';
import { loadSnapshot } from './snapshot';

type Store = { state: State; actions: Actions };

const StoreContext = createContext<Store | null>(null);

export function useMobileStore(): Store {
  const store = use(StoreContext);
  if (!store) throw new Error('useMobileStore must be used inside <MobileStoreProvider>');
  return store;
}

type Props = {
  db: Db;
  // Injectable for tests; defaults to the real clock.
  clock?: () => Date;
  children: ReactNode;
};

const defaultClock = () => new Date();

// Loads the device's data from SQLite and keeps it fresh. Writes go through the
// repositories (which enforce locking, re-derive today's targets and queue
// Health Connect work in one transaction); the store reloads afterwards. The
// local day is re-checked on foreground and at local midnight.
export function MobileStoreProvider({ db, clock = defaultClock, children }: Props) {
  const [state, dispatch] = useReducer(reducer, { status: 'loading' });
  const todayRef = useRef('');
  if (!todayRef.current) todayRef.current = localDate(clock());
  const clockRef = useRef(clock);
  clockRef.current = clock;

  const refresh = useCallback(async () => {
    try {
      const data = await loadSnapshot(db);
      dispatch({ type: 'loaded', today: todayRef.current, data });
    } catch (error) {
      dispatch({ type: 'failed', message: error instanceof Error ? error.message : String(error) });
    }
  }, [db]);

  // Roll `today` over if the local day changed, then reload.
  const sync = useCallback(async () => {
    try {
      const today = localDate(clockRef.current());
      todayRef.current = today;
      await ensureToday(db, today);
      await refresh();
    } catch (error) {
      dispatch({ type: 'failed', message: error instanceof Error ? error.message : String(error) });
    }
  }, [db, refresh]);

  useEffect(() => {
    void ensureSeeded(db).then(sync);
  }, [db, sync]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') void sync();
    });
    return () => subscription.remove();
  }, [sync]);

  // Re-check the day just after local midnight, even if the app stays foregrounded.
  const onMidnight = useEffectEvent(() => void sync());
  const today = state.status === 'ready' ? state.today : null;
  useEffect(() => {
    if (!today) return;
    const timer = setTimeout(onMidnight, msUntilNextLocalMidnight(clockRef.current()) + 1000);
    return () => clearTimeout(timer);
  }, [today]);

  const actions = useMemo(() => createActions(db, () => todayRef.current, refresh), [db, refresh]);
  const value = useMemo(() => ({ state, actions }), [state, actions]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
