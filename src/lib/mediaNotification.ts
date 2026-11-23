import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';

export interface MediaTrack {
  title: string;
  artist: string;
  artwork: string;
  duration: number; // ms
  position: number; // ms
  playing: boolean;
}

interface MediaNotificationPlugin {
  start(options: MediaTrack): Promise<void>;
  update(options: MediaTrack): Promise<void>;
  stop(): Promise<void>;
  addListener(
    eventName: 'action',
    listenerFunc: (event: { action: string; value: number }) => void,
  ): Promise<PluginListenerHandle>;
}

const MediaNotification = registerPlugin<MediaNotificationPlugin>('MediaNotification');

export const isMediaNotificationSupported = (): boolean => Capacitor.isNativePlatform();

export function startMediaNotification(track: MediaTrack): void {
  if (!isMediaNotificationSupported()) return;
  void MediaNotification.start(track).catch(() => undefined);
}

export function syncMediaNotification(track: MediaTrack): void {
  if (!isMediaNotificationSupported()) return;
  void MediaNotification.update(track).catch(() => undefined);
}

export function stopMediaNotification(): void {
  if (!isMediaNotificationSupported()) return;
  void MediaNotification.stop().catch(() => undefined);
}

export function listenMediaNotificationActions(
  listener: (event: { action: string; value: number }) => void,
): Promise<PluginListenerHandle> {
  return MediaNotification.addListener('action', listener);
}
