/**
 * One-off replacement cleanup.
 *
 * Removes only the three English-speaking cybersecurity hosts that were
 * replaced by verified Arabic-speaking hosts in import-real-catalog.mjs.
 * This is deliberately targeted — it never wipes the catalog.
 *
 * Run while supabase/enable_seed_writes.sql is active:
 *   node scripts/remove-replaced-cyber-hosts.mjs
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const ENV = Object.fromEntries(
  fs
    .readFileSync(path.join(ROOT, '.env'), 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const i = line.indexOf('=');
      return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
    })
);

const REST = `${ENV.VITE_SUPABASE_URL}/rest/v1`;
const HEADERS = {
  apikey: ENV.VITE_SUPABASE_ANON_KEY,
  Authorization: `Bearer ${ENV.VITE_SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
};

const TARGET_SLUGS = [
  'jack-rhysider',
  'patrick-gray',
  'steve-gibson',
];

async function rest(pathname, init = {}) {
  const res = await fetch(`${REST}${pathname}`, {
    ...init,
    headers: { ...HEADERS, ...(init.headers || {}) },
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`${init.method || 'GET'} ${pathname} → ${res.status}: ${body.slice(0, 300)}`);
  return body ? JSON.parse(body) : null;
}

async function remove() {
  const slugFilter = TARGET_SLUGS.join(',');
  const hosts = await rest(`/hosts?select=id,slug&slug=in.(${slugFilter})`);
  if (!Array.isArray(hosts)) throw new Error('Unexpected hosts response');

  const found = new Set(hosts.map((host) => host.slug));
  for (const slug of TARGET_SLUGS) {
    if (!found.has(slug)) console.log(`already absent: ${slug}`);
  }

  for (const host of hosts) {
    const podcasts = await rest(`/podcasts?select=id&host_id=eq.${host.id}`);
    const podcastIds = (podcasts || []).map((podcast) => podcast.id);

    if (podcastIds.length) {
      await rest(`/episodes?podcast_id=in.(${podcastIds.join(',')})`, {
        method: 'DELETE',
        headers: { Prefer: 'return=minimal' },
      });
      await rest(`/podcasts?host_id=eq.${host.id}`, {
        method: 'DELETE',
        headers: { Prefer: 'return=minimal' },
      });
    }

    await rest(`/hosts?id=eq.${host.id}`, {
      method: 'DELETE',
      headers: { Prefer: 'return=minimal' },
    });

    console.log(`removed ${host.slug}: ${podcastIds.length} shows and their episodes`);
  }

  console.log('Done. Only the three replaced English hosts were touched.');
}

remove().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
