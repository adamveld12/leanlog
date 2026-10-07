import type {
  HealthConnectRecord,
  Permission,
  ReadRecordsOptions,
  ReadRecordsResult,
  RecordType,
} from 'react-native-health-connect';

// The slice of react-native-health-connect that Leanlog uses. The service talks
// to this interface so it can be tested without the native module; the real
// implementation (nativeClient.ts) is the only file that imports the package.
export interface HealthConnectClient {
  getSdkStatus(): Promise<number>;
  initialize(): Promise<boolean>;
  requestPermission(permissions: Permission[]): Promise<Permission[]>;
  getGrantedPermissions(): Promise<Permission[]>;
  insertRecords(records: HealthConnectRecord[]): Promise<string[]>;
  deleteRecordsByUuids(
    recordType: RecordType,
    recordIds: string[],
    clientRecordIds: string[],
  ): Promise<void>;
  readRecords<T extends RecordType>(
    recordType: T,
    options: ReadRecordsOptions,
  ): Promise<ReadRecordsResult<T>>;
  openHealthConnectSettings(): void;
}
