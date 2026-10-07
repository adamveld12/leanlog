import type { BackupIO } from '../backup/io';

// In-memory stand-in for the file system, share sheet and document picker.
export class FakeBackupIo implements BackupIO {
  readonly files = new Map<string, string>();
  readonly shared: string[] = [];
  // What the document picker "returns": a file, null for cancelled, or an Error.
  picked: { name: string; contents: string } | null | Error = null;
  failShare: Error | null = null;
  private seq = 0;

  writeCacheFile = async (name: string, contents: string) => {
    const uri = `file:///cache/${name}`;
    this.files.set(uri, contents);
    return uri;
  };

  share = async (uri: string) => {
    if (this.failShare) throw this.failShare;
    this.shared.push(uri);
  };

  pickFile = async () => {
    if (this.picked instanceof Error) throw this.picked;
    if (!this.picked) return null;
    const uri = `file:///picked/${(this.seq += 1)}-${this.picked.name}`;
    this.files.set(uri, this.picked.contents);
    return { uri, name: this.picked.name };
  };

  readFile = async (uri: string) => {
    const contents = this.files.get(uri);
    if (contents === undefined) throw new Error('file not found');
    return contents;
  };
}
