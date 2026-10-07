import {
  deleteRecordsByUuids,
  getGrantedPermissions,
  getSdkStatus,
  initialize,
  insertRecords,
  openHealthConnectSettings,
  readRecords,
  requestPermission,
  type Permission,
} from 'react-native-health-connect';
import type { HealthConnectClient } from './client';

// The only module that loads react-native-health-connect at runtime. Special
// permissions (exercise routes, background access) are never requested, so the
// results can be narrowed to plain read/write record permissions.
const plain = (permissions: { accessType: string; recordType: string }[]) =>
  permissions as Permission[];

export const nativeClient: HealthConnectClient = {
  getSdkStatus: () => getSdkStatus(),
  initialize: () => initialize(),
  requestPermission: async (permissions) => plain(await requestPermission(permissions)),
  getGrantedPermissions: async () => plain(await getGrantedPermissions()),
  insertRecords,
  deleteRecordsByUuids,
  readRecords,
  openHealthConnectSettings,
};
