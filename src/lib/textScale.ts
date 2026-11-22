import { Capacitor, registerPlugin } from '@capacitor/core';

export const TEXT_SCALE_KEY = 'sada:fixed-text-scale';

interface TextScalePlugin {
  setFixed(options: { fixed: boolean }): Promise<{ fixed: boolean }>;
  getState(): Promise<{ fixed: boolean; zoom: number }>;
}

const TextScale = registerPlugin<TextScalePlugin>('TextScale');

export const isNativeTextScaleSupported = (): boolean => Capacitor.isNativePlatform();

export function readFixedTextScale(): boolean {
  try {
    return localStorage.getItem(TEXT_SCALE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function writeFixedTextScale(fixed: boolean): void {
  try {
    localStorage.setItem(TEXT_SCALE_KEY, String(fixed));
  } catch {
    // Storage can be disabled — the setting still applies for this session.
  }
}

/**
 * Applies the preference to both the WebView (native) and CSS (browser/PWA).
 * Native persistence lives in SharedPreferences so MainActivity can restore it
 * before the first paint, even after Xiaomi restarts the activity.
 */
export function applyFixedTextScale(fixed: boolean): void {
  const root = document.documentElement;
  root.classList.toggle('fixed-text-scale', fixed);
  root.style.fontSize = fixed ? '16px' : '';

  if (isNativeTextScaleSupported()) {
    void TextScale.setFixed({ fixed }).catch(() => {
      // MainActivity / CSS fallback still keeps the text at the normal size.
    });
  }
}

export async function getNativeTextScaleState(): Promise<{ fixed: boolean; zoom: number } | null> {
  if (!isNativeTextScaleSupported()) return null;
  try {
    return await TextScale.getState();
  } catch {
    return null;
  }
}
