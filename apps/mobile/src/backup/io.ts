// What backup needs from the device: a cache file to write, the share sheet, the
// document picker, and a way to read the chosen file. An interface so the logic
// can be tested without the native modules; nativeIo.ts is the real thing.
export interface BackupIO {
  // Writes `contents` to a file in the app's cache and returns its URI.
  writeCacheFile(name: string, contents: string): Promise<string>;
  share(uri: string): Promise<void>;
  // The chosen file, or null if the user cancelled.
  pickFile(): Promise<{ uri: string; name: string } | null>;
  readFile(uri: string): Promise<string>;
}
