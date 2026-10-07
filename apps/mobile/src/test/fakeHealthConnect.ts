import type {
  HealthConnectRecord,
  Permission,
  ReadRecordsOptions,
  ReadRecordsResult,
  RecordType,
} from 'react-native-health-connect';
import type { HealthConnectClient } from '../health/client';

type Stored = { id: string; origin: string; version: number; record: HealthConnectRecord };

type Options = {
  // SdkAvailabilityStatus: 1 unavailable, 2 update required, 3 available.
  status?: number;
  // The app's own package: stamped as the dataOrigin of everything it inserts.
  ownPackage: string;
  // Permissions granted when the user is asked; default is everything asked for.
  grant?: (asked: Permission[]) => Permission[];
};

// In-memory Health Connect with the platform rules the app relies on:
// records with a clientRecordId are upserted (an insert only replaces an
// existing record when its clientRecordVersion is higher), every record
// carries its writer's data origin, and reads return converted units.
export class FakeHealthConnect implements HealthConnectClient {
  readonly stored = new Map<string, Stored>();
  granted: Permission[] = [];
  insertCalls = 0;
  // Fail the next N insert calls (to exercise retries).
  failInserts = 0;
  settingsOpened = 0;
  // Runs while an insert is "in flight", before it lands (to simulate an edit during a send).
  onInsert?: () => Promise<void>;
  private seq = 0;

  private readonly options: Options;

  constructor(options: Options) {
    this.options = options;
  }

  getSdkStatus = async () => this.options.status ?? 3;
  initialize = async () => (this.options.status ?? 3) === 3;

  requestPermission = async (asked: Permission[]) => {
    const granted = this.options.grant ? this.options.grant(asked) : asked;
    this.granted = granted;
    return granted;
  };
  getGrantedPermissions = async () => this.granted;

  insertRecords = async (records: HealthConnectRecord[]) => {
    this.insertCalls += 1;
    if (this.failInserts > 0) {
      this.failInserts -= 1;
      throw new Error('Health Connect is busy');
    }
    await this.onInsert?.();
    return records.map((record) => this.put(record, this.options.ownPackage));
  };

  deleteRecordsByUuids = async (type: RecordType, ids: string[], clientIds: string[]) => {
    for (const [key, s] of this.stored) {
      if (s.record.recordType !== type) continue;
      if (ids.includes(s.id) || clientIds.includes(s.record.metadata?.clientRecordId ?? '\0')) {
        this.stored.delete(key);
      }
    }
  };

  readRecords = async <T extends RecordType>(
    type: T,
    options: ReadRecordsOptions,
  ): Promise<ReadRecordsResult<T>> => {
    const filter = options.timeRangeFilter;
    const inRange = (iso: string) =>
      filter.operator === 'between'
        ? iso >= filter.startTime && iso < filter.endTime
        : filter.operator === 'after'
          ? iso >= filter.startTime
          : iso < filter.endTime;
    const rows = [...this.stored.values()]
      .filter((s) => s.record.recordType === type)
      .filter((s) => 'time' in s.record && inRange(s.record.time))
      .map((s) => ({
        ...convert(s.record),
        metadata: { ...s.record.metadata, dataOrigin: s.origin, id: s.id },
      }));
    rows.sort((a, b) => (a.time < b.time ? -1 : 1));
    if (!options.ascendingOrder) rows.reverse();
    // `convert` returns the library's *Result shapes.
    return { records: rows } as unknown as ReadRecordsResult<T>;
  };

  openHealthConnectSettings = () => {
    this.settingsOpened += 1;
  };

  // A record written by another app (a smart scale, say).
  addExternal(record: HealthConnectRecord, origin: string): void {
    this.put(record, origin);
  }

  recordsOfType(type: RecordType): HealthConnectRecord[] {
    return [...this.stored.values()].map((s) => s.record).filter((r) => r.recordType === type);
  }

  private put(record: HealthConnectRecord, origin: string): string {
    const clientId = record.metadata?.clientRecordId;
    const version = record.metadata?.clientRecordVersion ?? 0;
    const key = clientId ? `${origin}|${record.recordType}|${clientId}` : `#${(this.seq += 1)}`;
    const existing = this.stored.get(key);
    if (existing) {
      if (version > existing.version) this.stored.set(key, { ...existing, version, record });
      return existing.id;
    }
    const id = `hc-${(this.seq += 1)}`;
    this.stored.set(key, { id, origin, version, record });
    return id;
  }
}

// The library returns weights/heights in every unit; the fake derives them.
function convert(record: HealthConnectRecord): Record<string, unknown> & { time: string } {
  if (record.recordType === 'Weight') {
    const lb =
      record.weight.unit === 'pounds' ? record.weight.value : record.weight.value * 2.20462;
    return { ...record, weight: { inPounds: lb, inKilograms: lb / 2.20462 } } as never;
  }
  if (record.recordType === 'Height') {
    const inches =
      record.height.unit === 'inches' ? record.height.value : record.height.value * 39.3701;
    return { ...record, height: { inInches: inches, inMeters: inches / 39.3701 } } as never;
  }
  return record as never;
}
