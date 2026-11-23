import { Capacitor, registerPlugin } from '@capacitor/core';

export type NativeDownloadStatus =
  | 'IDLE'
  | 'PENDING'
  | 'RUNNING'
  | 'PAUSED'
  | 'SUCCESSFUL'
  | 'FAILED'
  | 'MISSING'
  | 'UNKNOWN';

export interface NativeDownloadState {
  id: number;
  episodeId: string;
  status: NativeDownloadStatus;
  bytes: number;
  total: number;
  reason: number;
  uri: string;
}

interface AudioDownloadPlugin {
  start(options: { url: string; episodeId: string; title: string }): Promise<NativeDownloadState>;
  status(options: { id: number; episodeId: string }): Promise<NativeDownloadState>;
  cancel(options: { id: number; episodeId: string }): Promise<void>;
  delete(options: { episodeId: string }): Promise<void>;
}

const AudioDownload = registerPlugin<AudioDownloadPlugin>('AudioDownload');

export const canUseNativeDownloads = (): boolean => Capacitor.isNativePlatform();

export function startNativeDownload(options: {
  url: string;
  episodeId: string;
  title: string;
}): Promise<NativeDownloadState> {
  return AudioDownload.start(options);
}

export function getNativeDownloadStatus(id: number, episodeId: string): Promise<NativeDownloadState> {
  return AudioDownload.status({ id, episodeId });
}

export function cancelNativeDownload(id: number, episodeId: string): Promise<void> {
  return AudioDownload.cancel({ id, episodeId });
}

export function deleteNativeDownload(episodeId: string): Promise<void> {
  return AudioDownload.delete({ episodeId });
}

/** Capacitor serves app-local files through the same-origin local bridge. */
export function localSourceForNativeUri(uri: string): string {
  if (!uri) return '';
  return Capacitor.convertFileSrc ? Capacitor.convertFileSrc(uri) : uri;
}
