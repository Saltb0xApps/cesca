/**
 * Audio files live in `<documents>/recordings/<id>.m4a`. Only the file *name*
 * is stored in app state; absolute paths are resolved here at use time
 * because the iOS app-container path changes between installs.
 */
import { Directory, File, Paths } from 'expo-file-system';

export function recordingsDirectory(): Directory {
  return new Directory(Paths.document, 'recordings');
}

function ensureDirectory(): Directory {
  const dir = recordingsDirectory();
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
}

/** Move a freshly recorded temp file into permanent storage. Returns the file name. */
export async function persistRecording(tempUri: string, id: string): Promise<string> {
  const dir = ensureDirectory();
  const name = `${id}.m4a`;
  const source = new File(tempUri);
  const destination = new File(dir, name);
  await source.move(destination);
  return name;
}

export function uriForRecording(audioFile: string): string {
  return new File(recordingsDirectory(), audioFile).uri;
}

export function recordingExists(audioFile: string): boolean {
  try {
    return new File(recordingsDirectory(), audioFile).exists;
  } catch {
    return false;
  }
}

export function deleteRecordingFile(audioFile: string): void {
  try {
    const file = new File(recordingsDirectory(), audioFile);
    if (file.exists) file.delete();
  } catch {
    // Best effort — a missing file is fine when deleting.
  }
}
