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
import { exportBackup } from '../backup/exportData';
import { pickBackup, type ImportPreview } from '../backup/importData';
import type { BackupIO } from '../backup/io';
import { ensureSeeded } from '../db/repos/base';
import { replaceAll } from '../db/repos/exportImport';
import { ensureToday } from '../db/repos/targets';
import type { Db } from '../db/types';
import type { HealthConnectService } from '../health/HealthConnectService';
import { createActions, type Actions } from './actions';
import { localDate, msUntilNextLocalMidnight } from './date';
import { reducer, type State } from './reducer';
import { loadSnapshot } from './snapshot';

// Present when Health Connect is wired in; `connect`/`disconnect` also reload the
// store so imported data and settings show up.
type HealthConnectControls = {
  service: HealthConnectService;
  connect: () => Promise<boolean>;
  disconnect: () => Promise<void>;
};

// Present when the device's file system, share sheet and picker are wired in.
type BackupControls = {
  exportBackup: () => ReturnType<typeof exportBackup>;
  pickBackup: () => Promise<ImportPreview | null>;
  // Replaces all local data with the (already validated) preview, then makes sure today exists.
  importBackup: (preview: ImportPreview) => Promise<void>;
};

type Store = {
  state: State;
  actions: Actions;
  healthConnect: HealthConnectControls | null;
  backup: BackupControls | null;
};

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
  // Optional: sends saved data to Health Connect and imports a smart-scale weight.
  healthConnect?: HealthConnectService;
  // Optional: export/import through the share sheet and document picker.
  backupIo?: BackupIO;
  children: ReactNode;
};

const defaultClock = () => new Date();

// Loads the device's data from SQLite and keeps it fresh. Writes go through the
// repositories (which enforce locking, re-derive today's targets and queue
// Health Connect work in one transaction); the store reloads afterwards. The
// local day is re-checked on foreground and at local midnight.
export function MobileStoreProvider({
  db,
  clock = defaultClock,
  healthConnect,
  backupIo,
  children,
}: Props) {
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

  // Health Connect is best-effort: a failure here must never block or break the
  // app. Anything unsent stays queued and goes out on the next flush.
  const syncHealthConnect = useCallback(async () => {
    if (!healthConnect) return;
    try {
      if (await healthConnect.importTodayWeight(todayRef.current)) await refresh();
      await healthConnect.flushQueue();
    } catch {
      // Retried on the next foreground or write.
    }
  }, [healthConnect, refresh]);

  // Roll `today` over if the local day changed, then reload.
  const sync = useCallback(async () => {
    try {
      const today = localDate(clockRef.current());
      todayRef.current = today;
      await ensureToday(db, today);
      await refresh();
      void syncHealthConnect();
    } catch (error) {
      dispatch({ type: 'failed', message: error instanceof Error ? error.message : String(error) });
    }
  }, [db, refresh, syncHealthConnect]);

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

  // After each write: reload from SQLite, then send queued work to Health Connect
  // in the background so a slow or missing Health Connect never delays the save.
  const afterWrite = useCallback(async () => {
    await refresh();
    void healthConnect?.flushQueue().catch(() => undefined);
  }, [healthConnect, refresh]);

  const actions = useMemo(
    () => createActions(db, () => todayRef.current, afterWrite),
    [db, afterWrite],
  );
  const healthConnectControls = useMemo<HealthConnectControls | null>(
    () =>
      healthConnect
        ? {
            service: healthConnect,
            connect: async () => {
              const connected = await healthConnect.connect();
              await refresh();
              if (connected) void syncHealthConnect();
              return connected;
            },
            disconnect: async () => {
              await healthConnect.disconnect();
              await refresh();
            },
          }
        : null,
    [healthConnect, refresh, syncHealthConnect],
  );
  const backup = useMemo<BackupControls | null>(
    () =>
      backupIo
        ? {
            exportBackup: () => exportBackup(db, backupIo, clockRef.current()),
            pickBackup: () => pickBackup(backupIo),
            importBackup: async (preview) => {
              // Each step depends on the one before: replace, then recreate today, then reload.
              // react-doctor-disable-next-line react-doctor/async-parallel
              await replaceAll(db, preview.data);
              await ensureToday(db, todayRef.current);
              await refresh();
            },
          }
        : null,
    [db, backupIo, refresh],
  );
  const value = useMemo(
    () => ({ state, actions, healthConnect: healthConnectControls, backup }),
    [state, actions, healthConnectControls, backup],
  );
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
