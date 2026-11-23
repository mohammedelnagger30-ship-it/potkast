/**
 * Talks to GitHub Releases, which is the single source of truth for Sada
 * versions. Publishing a release automatically makes it the "latest update"
 * for every installed app — no separate manifest to maintain.
 */

import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';

export const BUNDLED_VERSION = '1.4.1'; // Keep in sync with android/app/build.gradle versionName.

export const UPDATE_CACHE_KEY = 'sada:update-cache';
export const UPDATE_DISMISSED_KEY = 'sada:update-dismissed';
export const UPDATE_NOTIFIED_KEY = 'sada:update-notified';
export const UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

const REPO = 'mohammedelnagger30-ship-it/potkast';
const LATEST_URL = `https://api.github.com/repos/${REPO}/releases/latest`;
const RELEASES_URL = `https://api.github.com/repos/${REPO}/releases?per_page=6`;

export interface AppRelease {
  tag: string;
  version: string;
  name: string;
  notes: string;
  publishedAt: string;
  url: string;
  apkUrl: string | null;
  apkName: string | null;
  apkSize: number | null;
}

export interface UpdateCache {
  latest: AppRelease;
  recent: AppRelease[];
  checkedAt: number;
}

interface GithubAsset {
  name: string;
  size: number;
  browser_download_url: string;
  content_type: string;
}

interface GithubRelease {
  tag_name: string;
  name: string | null;
  body: string | null;
  published_at: string;
  html_url: string;
  draft: boolean;
  prerelease: boolean;
  assets: GithubAsset[];
}

function normalizeVersion(raw: string): string {
  return raw.trim().replace(/^v/i, '').split(/[+\s]/)[0] || '0.0.0';
}

export function parseVersion(raw: string): number[] {
  return normalizeVersion(raw).split('.').map((part) => Number.parseInt(part, 10) || 0);
}

export function compareVersions(a: string, b: string): number {
  const left = parseVersion(a);
  const right = parseVersion(b);
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i += 1) {
    const diff = (left[i] || 0) - (right[i] || 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

export function isNewer(candidate: string, current: string): boolean {
  return compareVersions(candidate, current) > 0;
}

function mapRelease(release: GithubRelease): AppRelease {
  const apk = release.assets.find((asset) => asset.name.toLowerCase().endsWith('.apk')) || null;
  return {
    tag: release.tag_name,
    version: normalizeVersion(release.tag_name),
    name: release.name || release.tag_name,
    notes: release.body || '',
    publishedAt: release.published_at,
    url: release.html_url,
    apkUrl: apk?.browser_download_url || null,
    apkName: apk?.name || null,
    apkSize: apk?.size || null,
  };
}

async function fetchJson<T>(url: string, timeoutMs = 9000): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: 'no-store',
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    if (!response.ok) throw new Error(`GitHub API ${response.status}`);
    return (await response.json()) as T;
  } finally {
    window.clearTimeout(timer);
  }
}

export async function fetchLatestRelease(): Promise<AppRelease> {
  return mapRelease(await fetchJson<GithubRelease>(LATEST_URL));
}

export async function fetchRecentReleases(): Promise<AppRelease[]> {
  const releases = await fetchJson<GithubRelease[]>(RELEASES_URL);
  return releases
    .filter((release) => !release.draft && !release.prerelease)
    .map(mapRelease);
}

export async function getCurrentVersion(): Promise<string> {
  // Dev-only QA switch: set sada:update-force-version to 1.0.0 to preview the update UI.
  if (import.meta.env.DEV) {
    try {
      const forced = localStorage.getItem('sada:update-force-version');
      if (forced) return normalizeVersion(forced);
    } catch { /* ignore */ }
  }
  if (Capacitor.isNativePlatform()) {
    try {
      const info = await CapacitorApp.getInfo();
      if (info?.version) return normalizeVersion(info.version);
    } catch {
      // Browser QA or an old native shell: fall back to the bundled version.
    }
  }
  return BUNDLED_VERSION;
}

export function formatBytes(bytes: number | null): string {
  if (!bytes || bytes <= 0) return '—';
  const units = ['بايت', 'ك.ب', 'م.ب', 'ج.ب'];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

export function formatReleaseDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium' }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function formatReleaseNotes(body: string): string[] {
  return body
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line
      .replace(/^#{1,6}\s*/, '')
      .replace(/^\s*[-*+]\s+/, '• ')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/\*\*|__|`/g, ''))
    .slice(0, 14);
}

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be full or disabled; update checking still works in memory.
  }
}

function readText(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeText(key: string, value: string | null): void {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    // Ignore storage failures.
  }
}

export function readUpdateCache(): UpdateCache | null {
  const cache = readJson<UpdateCache>(UPDATE_CACHE_KEY);
  if (!cache?.latest?.version || !cache.checkedAt) return null;
  return { ...cache, recent: Array.isArray(cache.recent) ? cache.recent : [] };
}

export function writeUpdateCache(cache: UpdateCache): void {
  writeJson(UPDATE_CACHE_KEY, cache);
}

export function readDismissedVersion(): string | null {
  return readText(UPDATE_DISMISSED_KEY);
}

export function writeDismissedVersion(version: string | null): void {
  writeText(UPDATE_DISMISSED_KEY, version);
}

export function readNotifiedVersion(): string | null {
  return readText(UPDATE_NOTIFIED_KEY);
}

export function writeNotifiedVersion(version: string | null): void {
  writeText(UPDATE_NOTIFIED_KEY, version);
}
