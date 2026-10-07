import { getDocumentAsync } from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import { isAvailableAsync, shareAsync } from 'expo-sharing';
import type { BackupIO } from './io';

export const nativeIo: BackupIO = {
  async writeCacheFile(name, contents) {
    const file = new File(Paths.cache, name);
    file.create({ overwrite: true });
    file.write(contents);
    return file.uri;
  },

  async share(uri) {
    if (!(await isAvailableAsync())) throw new Error('Sharing is not available on this device.');
    await shareAsync(uri, {
      mimeType: 'application/json',
      dialogTitle: 'Export LeanLog data',
      UTI: 'public.json',
    });
  },

  async pickFile() {
    // Any file type: Android reports JSON as several MIME types, and the content is validated anyway.
    const result = await getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
    if (result.canceled) return null;
    const [asset] = result.assets;
    return { uri: asset.uri, name: asset.name };
  },

  readFile: (uri) => new File(uri).text(),
};
