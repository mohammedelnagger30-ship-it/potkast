/**
 * Build the instant-play index used by podcast cards.
 *
 * The index contains the newest playable episode of every podcast, so tapping
 * play never has to wait for a Supabase round trip. It is generated from the
 * real catalog, not from samples or invented data.
 *
 * Usage: node scripts/build-quickplay-index.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const env = Object.fromEntries(
  fs.readFileSync(path.join(ROOT, '.env'), 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const i = line.indexOf('=');
      return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
    })
);

const rest = `${env.VITE_SUPABASE_URL}/rest/v1`;
const key = env.VITE_SUPABASE_ANON_KEY;
const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  Accept: 'application/json',
};
const PAGE = 1000;
const fields = 'id,podcast_id,title,audio_url,duration_seconds';
const firstByPodcast = new Map();
let offset = 0;
let pages = 0;

while (true) {
  const url = `${rest}/episodes?select=${fields}&order=published_at.desc&limit=${PAGE}&offset=${offset}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`episodes ${offset}: HTTP ${res.status} ${await res.text()}`);
  const rows = await res.json();
  pages += 1;
  for (const row of rows) {
    if (!row.audio_url || !row.podcast_id) continue;
    if (!firstByPodcast.has(row.podcast_id)) {
      firstByPodcast.set(row.podcast_id, {
        id: row.id,
        podcast_id: row.podcast_id,
        title: row.title,
        audio_url: row.audio_url,
        duration_seconds: row.duration_seconds,
      });
    }
  }
  if (rows.length < PAGE) break;
  offset += PAGE;
  if (pages > 200) throw new Error('Too many pages — aborting');
}

const outPath = path.join(ROOT, 'public', 'first-episodes.json');
fs.writeFileSync(outPath, JSON.stringify(Object.fromEntries(firstByPodcast)));
console.log(`Wrote ${firstByPodcast.size} podcasts from ${pages} pages to public/first-episodes.json`);
