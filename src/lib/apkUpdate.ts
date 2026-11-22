import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';

export interface ApkProgress {
  downloadId?: number;
  status: 'IDLE' | 'PENDING' | 'RUNNING' | 'PAUSED' | 'SUCCESSFUL' | 'FAILED' | 'MISSING';
  bytes?: number;
  total?: number;
  reason?: number;
}

interface ApkUpdatePlugin {
  startDownload(options: { url: string; fileName: string }): Promise<{ downloadId: number }>;
  getProgress(options: { downloadId: number }): Promise<ApkProgress>;
  cancelDownload(options?: { downloadId?: number }): Promise<void>;
  canInstall(): Promise<{ canInstall: boolean }>;
  requestInstallPermission(): Promise<void>;
  install(options: { downloadId: number }): Promise<void>;
  addListener(
    eventName: 'downloadComplete',
    listenerFunc: (event: { downloadId: number }) => void,
  ): Promise<PluginListenerHandle>;
}

const ApkUpdate = registerPlugin<ApkUpdatePlugin>('ApkUpdate');

export const isNativeUpdateSupported = (): boolean => Capacitor.isNativePlatform();

export { ApkUpdate };
