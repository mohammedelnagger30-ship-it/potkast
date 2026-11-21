/**
 * Nammy — one-time importer for the REAL catalog of every host.
 *
 * For each host it finds every show the host/publisher has on Apple Podcasts,
 * downloads each public RSS feed, and stores EVERY episode it contains
 * (real titles, real descriptions, real audio URLs, real dates).
 *
 * Usage:
 *   node scripts/import-real-catalog.mjs --dry     # fetch + report only
 *   node scripts/import-real-catalog.mjs           # wipe content tables + import
 *
 * Requires `supabase/enable_seed_writes.sql` to have been run once.
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

const SUPABASE_URL = ENV.VITE_SUPABASE_URL;
const ANON_KEY = ENV.VITE_SUPABASE_ANON_KEY;
const REST = `${SUPABASE_URL}/rest/v1`;
const DRY = process.argv.includes('--dry');

const UA = 'NammyCatalogImporter/2.0 (+https://nammy.app)';

/* ------------------------------------------------------------------ */
/* Hosts to import (real publishers / hosts, Arabic catalog)           */
/* ------------------------------------------------------------------ */

const HOSTS = [
  {
    artist: 'ثمانية/ thmanyah',
    name_ar: 'ثمانية | Thmanyah',
    slug: 'thmanyah',
    title_ar: 'شبكة',
    specialty_ar: 'بودكاست عربي',
    country: 'السعودية',
    type: 'cultural',
  },
  {
    artist: 'Mics مايكس',
    name_ar: 'مايكس | Mics',
    slug: 'mics',
    title_ar: 'شبكة',
    specialty_ar: 'بودكاست عربي',
    country: 'السعودية',
    type: 'cultural',
  },
  {
    artist: 'Sowt Media | صوت',
    name_ar: 'صوت | Sowt',
    slug: 'sowt',
    title_ar: 'شبكة',
    specialty_ar: 'بودكاست عربي',
    country: 'الأردن',
    type: 'cultural',
  },
  {
    artist: 'Global Digital Media',
    name_ar: 'الدحيح',
    slug: 'el-daheeh',
    title_ar: '',
    specialty_ar: 'محتوى معرفي',
    country: 'مصر',
    type: 'scientific',
  },
  {
    artist: 'Mustafa Hosny',
    name_ar: 'مصطفى حسني',
    slug: 'mustafa-hosny',
    title_ar: 'الداعية',
    specialty_ar: 'دين وتزكية',
    country: 'مصر',
    type: 'religious',
  },
  {
    artist: 'أمجد سمير',
    name_ar: 'أمجد سمير',
    slug: 'amgad-samir',
    title_ar: 'الشيخ',
    specialty_ar: 'علوم إسلامية',
    country: 'مصر',
    type: 'religious',
  },
  {
    artist: 'TPP',
    name_ar: 'TPP',
    slug: 'tpp',
    title_ar: '',
    specialty_ar: 'بودكاست مصري',
    country: 'مصر',
    type: 'professional',
  },
  {
    artist: 'هلال السيد',
    name_ar: 'هلال السيد',
    slug: 'helal-elsayed',
    title_ar: '',
    specialty_ar: 'بودكاست فاهم',
    country: 'مصر',
    type: 'cultural',
  },
  {
    artist: 'Hazem El Seddiq, Ahmed Amer & Sherif Ali',
    name_ar: 'وعي',
    slug: 'wa3y',
    title_ar: 'بودكاست',
    specialty_ar: 'توعية وعلاقات',
    country: 'مصر',
    type: 'cultural',
  },
  {
    artist: 'Moneim',
    name_ar: 'بودكاست عقلية',
    slug: 'aqleya',
    title_ar: 'بودكاست',
    specialty_ar: 'تطوير ذات',
    country: 'مصر',
    type: 'motivational',
  },
  {
    artist: 'إذاعة مختلف',
    name_ar: 'إذاعة مختلف',
    slug: 'mukhtalif',
    title_ar: 'إذاعة',
    specialty_ar: 'بودكاست عربي',
    country: 'السعودية',
    type: 'cultural',
  },
  {
    artist: 'جام ستديو',
    name_ar: 'جام ستديو',
    slug: 'jam-studio',
    title_ar: 'استوديو',
    specialty_ar: 'بودكاست عربي',
    country: 'السعودية',
    type: 'cultural',
  },
  {
    artist: 'الشيخ سمير مصطفي',
    name_ar: 'سمير مصطفي',
    slug: 'samir-mustafa',
    title_ar: 'الشيخ',
    specialty_ar: 'دروس دينية',
    country: 'مصر',
    type: 'religious',
  },
  {
    artist: 'علم ينتفع به',
    name_ar: 'علم ينتفع به',
    slug: 'ilm-yunfa',
    title_ar: 'مكتبة',
    specialty_ar: 'دروس ومحاضرات',
    country: 'مصر',
    type: 'religious',
  },
];

const CATEGORY_BY_TYPE = {
  religious: 'روحاني / ديني',
  scientific: 'العلوم',
  cultural: 'ثقافة وأدب',
  motivational: 'المسيرة المهنية',
  professional: 'المسيرة المهنية',
};

const FINANCE_WORDS = ['مال', 'اقتصاد', 'استثمار', 'بزنس', 'بيزنس', 'شركة', 'أعمال', 'اعمال', 'ريادة', 'أرباح', 'ارباح', 'سوق', 'تمويل', 'بنك'];

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchWithRetry(url, options = {}, tries = 4) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, {
        ...options,
        headers: { 'User-Agent': UA, ...(options.headers || {}) },
        signal: AbortSignal.timeout(options.timeout || 30000),
      });
      if (res.status === 429 || res.status >= 500) {
        lastErr = new Error(`HTTP ${res.status}`);
        await sleep(700 * (i + 1));
        continue;
      }
      return res;
    } catch (err) {
      lastErr = err;
      await sleep(700 * (i + 1));
    }
  }
  throw lastErr;
}

async function pool(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await worker(items[i], i);
    }
  });
  await Promise.all(runners);
  return results;
}

function decodeEntities(str) {
  return String(str)
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&');
}

function sanitizeText(value) {
  return String(value)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, '')
    .replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '')
    .replace(/\uFFFD/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanText(html, max = 600) {
  if (!html) return '';
  let text = String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|li|h\d)>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
  text = sanitizeText(decodeEntities(text));
  if (text.length > max) text = `${text.slice(0, max - 1).trimEnd()}…`;
  return sanitizeText(text);
}

function tag(block, name) {
  const re = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i');
  const m = block.match(re);
  if (!m) return '';
  return m[1].replace(/^\s*<!\[CDATA\[/, '').replace(/\]\]>\s*$/, '').trim();
}

function attr(block, name, attribute) {
  const re = new RegExp(`<${name}\\b[^>]*\\b${attribute}\\s*=\\s*"([^"]*)"`, 'i');
  const m = block.match(re);
  return m ? m[1].trim() : '';
}

function toSeconds(value) {
  if (!value) return 0;
  const v = String(value).trim();
  if (/^\d+$/.test(v)) return parseInt(v, 10);
  const parts = v.split(':').map((p) => parseInt(p, 10));
  if (parts.some((p) => Number.isNaN(p))) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

function toIsoDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function hashPlays(seed, min, max) {
  let h = 2166136261;
  const s = String(seed);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return min + (Math.abs(h) % (max - min + 1));
}

function classify(text, fallbackType) {
  const t = String(text || '');
  const rules = [
    { type: 'religious', words: ['قرآن', 'القران', 'دين', 'إسلام', 'اسلام', 'سيرة', 'فقه', 'تفسير', 'دعاء', 'شيخ', 'حديث', 'صحابة', 'رمضان', 'تزكية', 'عبادة', 'الله', 'نبي', 'دروس', 'محاضرات'] },
    { type: 'professional', words: ['أعمال', 'اعمال', 'بزنس', 'بيزنس', 'شركة', 'ريادة', 'مشروع', 'تسويق', 'وظيفة', 'كاريير', 'مهني', 'إدارة', 'ادارة', 'قيادة', 'نجاح', 'مهارات', 'تطوير', 'مال', 'اقتصاد', 'استثمار', 'أرباح', 'ارباح', 'تمويل', 'بنك'] },
    { type: 'scientific', words: ['علم', 'علوم', 'تاريخ', 'فلسفة', 'فيزياء', 'فضاء', 'تقنية', 'تكنولوجيا', 'برمجة', 'ذكاء اصطناعي', 'طب', 'صحة'] },
    { type: 'motivational', words: ['تحفيز', 'طاقة', 'إلهام', 'الهام', 'عادة', 'عادات', 'تطوير ذات'] },
    { type: 'cultural', words: ['ثقافة', 'أدب', 'ادب', 'قصص', 'حكاية', 'مجتمع', 'سينما', 'فن', 'موسيقى', 'رياضة', 'كورة', 'mma'] },
  ];
  for (const rule of rules) {
    if (rule.words.some((w) => t.includes(w))) return rule.type;
  }
  return fallbackType || 'cultural';
}

/* ------------------------------------------------------------------ */
/* Apple Podcasts lookup                                               */
/* ------------------------------------------------------------------ */

async function itunesSearch(term, country) {
  const url = new URL('https://itunes.apple.com/search');
  url.searchParams.set('term', term);
  url.searchParams.set('entity', 'podcast');
  url.searchParams.set('media', 'podcast');
  url.searchParams.set('country', country);
  url.searchParams.set('limit', '200');
  try {
    const res = await fetchWithRetry(url.toString());
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json.results) ? json.results : [];
  } catch {
    return [];
  }
}

function normalizeName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&amp;/g, '&')
    .replace(/[ًٌٍَُِّْـ]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

async function findShows(artist) {
  const countries = ['eg', 'sa', 'ae', 'jo', 'kw', 'us'];
  const byId = new Map();
  const wanted = normalizeName(artist);

  const batches = await pool(countries, 3, async (country) => {
    const results = await itunesSearch(artist, country);
    await sleep(150);
    return results;
  });

  for (const results of batches) {
    for (const r of results) {
      if (!r.feedUrl) continue;
      if (normalizeName(r.artistName) !== wanted) continue;
      byId.set(String(r.collectionId || r.feedUrl), r);
    }
  }

  // Some publishers expose the same show twice under different ids.
  const byFeed = new Map();
  for (const show of byId.values()) {
    const key = String(show.feedUrl).replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (!byFeed.has(key)) byFeed.set(key, show);
  }
  const byName = new Map();
  for (const show of byFeed.values()) {
    const key = normalizeName(show.collectionName);
    if (!byName.has(key)) byName.set(key, show);
  }
  return [...byName.values()];
}

/* ------------------------------------------------------------------ */
/* RSS parsing                                                         */
/* ------------------------------------------------------------------ */

function parseFeed(xml, show) {
  const channelMatch = xml.match(/<channel[^>]*>([\s\S]*?)<\/channel>/i);
  const channel = channelMatch ? channelMatch[1] : xml;

  const items = [...channel.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].map((m) => m[1]);

  const episodes = [];
  const seenAudio = new Set();

  for (const item of items) {
    const audioUrl = attr(item, 'enclosure', 'url');
    if (!audioUrl || !/^https?:\/\//i.test(audioUrl)) continue;
    if (seenAudio.has(audioUrl)) continue;
    seenAudio.add(audioUrl);

    const title = cleanText(tag(item, 'title'), 300) || `حلقة ${episodes.length + 1}`;
    const description =
      cleanText(tag(item, 'content:encoded'), 600) ||
      cleanText(tag(item, 'description'), 600) ||
      cleanText(tag(item, 'itunes:summary'), 600);

    const duration = toSeconds(tag(item, 'itunes:duration'));
    const published = toIsoDate(tag(item, 'pubDate')) || toIsoDate(tag(item, 'published')) || new Date().toISOString();

    episodes.push({
      title,
      description,
      audio_url: audioUrl,
      duration_seconds: duration,
      published_at: published,
      plays_count: hashPlays(audioUrl, 800, 42000),
    });
  }

  const image =
    attr(channel, 'itunes:image', 'href') ||
    (channel.match(/<image[^>]*>([\s\S]*?)<\/image>/i) ? tag(channel.match(/<image[^>]*>([\s\S]*?)<\/image>/i)[1], 'url') : '') ||
    show.artworkUrl600 ||
    show.artworkUrl100 ||
    '';

  const feedTitle = cleanText(tag(channel, 'title'), 300) || show.collectionName;
  const feedDescription =
    cleanText(tag(channel, 'description'), 900) ||
    cleanText(tag(channel, 'itunes:summary'), 900) ||
    '';

  const genre = tag(channel, 'itunes:category') || show.primaryGenreName || '';

  return { episodes, image, feedTitle, feedDescription, genre };
}

/* ------------------------------------------------------------------ */
/* Build the catalog                                                   */
/* ------------------------------------------------------------------ */

async function buildCatalog() {
  const catalog = [];

  for (const host of HOSTS) {
    process.stdout.write(`\n→ ${host.name_ar} … `);
    const shows = await findShows(host.artist);
    if (shows.length === 0) {
      console.log('no shows found');
      continue;
    }

    const parsed = await pool(shows, 4, async (show) => {
      try {
        const res = await fetchWithRetry(show.feedUrl, { timeout: 45000 });
        if (!res.ok) return null;
        const xml = await res.text();
        const feed = parseFeed(xml, show);
        if (feed.episodes.length === 0) return null;
        return { show, feed };
      } catch {
        return null;
      }
    });

    const podcasts = parsed.filter(Boolean).map(({ show, feed }) => {
      const text = `${feed.feedTitle} ${feed.feedDescription} ${feed.genre}`;
      const type = classify(text, host.type);
      const category = FINANCE_WORDS.some((w) => text.includes(w)) ? 'المال والاستثمار' : CATEGORY_BY_TYPE[type];
      return {
        title: feed.feedTitle || show.collectionName,
        description: feed.feedDescription || cleanText(show.collectionName, 300),
        cover_url: feed.image || show.artworkUrl600 || '',
        type,
        category,
        episodes: feed.episodes.sort(
          (a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
        ),
      };
    });

    if (podcasts.length === 0) {
      console.log('no usable feeds');
      continue;
    }

    podcasts.sort((a, b) => b.episodes.length - a.episodes.length);

    const counts = new Map();
    for (const p of podcasts) counts.set(p.category, (counts.get(p.category) || 0) + 1);
    const mainCategory = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];

    const episodeTotal = podcasts.reduce((sum, p) => sum + p.episodes.length, 0);
    const bio =
      podcasts.map((p) => p.description).sort((a, b) => b.length - a.length)[0]?.slice(0, 400) || '';

    catalog.push({
      ...host,
      category: mainCategory,
      photo_url: podcasts[0].cover_url,
      bio_ar: bio,
      followers_count: Math.round(episodeTotal * 11 + podcasts.length * 900),
      podcasts,
    });

    console.log(`${podcasts.length} shows / ${episodeTotal} episodes`);
  }

  return catalog;
}

/* ------------------------------------------------------------------ */
/* Write to Supabase                                                   */
/* ------------------------------------------------------------------ */

const restHeaders = {
  apikey: ANON_KEY,
  Authorization: `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json',
};

async function rest(pathname, init = {}) {
  const res = await fetch(`${REST}${pathname}`, {
    ...init,
    headers: { ...restHeaders, ...(init.headers || {}) },
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`${init.method || 'GET'} ${pathname} → ${res.status}: ${body.slice(0, 400)}`);
  return body ? JSON.parse(body) : null;
}

async function deleteAll(table) {
  const res = await fetch(`${REST}/${table}?id=not.is.null`, {
    method: 'DELETE',
    headers: { ...restHeaders, Prefer: 'return=minimal' },
  });
  if (!res.ok) throw new Error(`DELETE ${table} → ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

async function insertBatch(table, rows) {
  if (rows.length === 0) return [];
  const res = await fetch(`${REST}/${table}`, {
    method: 'POST',
    headers: { ...restHeaders, Prefer: 'return=representation' },
    body: JSON.stringify(rows),
  });
  if (res.ok) return res.json();

  const detail = (await res.text()).slice(0, 500);
  if (rows.length > 1) {
    // Salvage the batch by splitting it: one bad row must not kill a whole show.
    console.warn(`\n  ! ${table} batch of ${rows.length} rejected (${detail.slice(0, 120)}) — retrying in halves`);
    const mid = Math.floor(rows.length / 2);
    const first = await insertBatch(table, rows.slice(0, mid));
    const second = await insertBatch(table, rows.slice(mid));
    return [...first, ...second];
  }
  throw new Error(`POST ${table} → ${res.status}: ${detail}`);
}

async function importCatalog(catalog) {
  console.log('\n--- categories ---');
  const categories = await rest('/categories?select=id,name_ar');
  const categoryId = new Map();
  for (const c of categories) if (!categoryId.has(c.name_ar)) categoryId.set(c.name_ar, c.id);

  console.log('--- clearing old content ---');
  await deleteAll('episodes');
  await deleteAll('podcasts');
  await deleteAll('hosts');

  let hostCount = 0;
  let podcastCount = 0;
  let episodeCount = 0;

  for (const host of catalog) {
    const [hostRow] = await insertBatch('hosts', [
      {
        name_ar: host.name_ar,
        slug: host.slug,
        photo_url: host.photo_url,
        cover_url: host.photo_url,
        title_ar: host.title_ar,
        specialty_ar: host.specialty_ar,
        bio_ar: host.bio_ar,
        country: host.country,
        category_id: categoryId.get(host.category) || null,
        is_verified: true,
        followers_count: host.followers_count,
        social_links: {},
      },
    ]);
    hostCount++;

    const podcastRows = host.podcasts.map((p) => ({
      title: p.title,
      description: p.description,
      host_name: host.name_ar,
      host_bio: host.bio_ar.slice(0, 300),
      host_id: hostRow.id,
      category_id: categoryId.get(p.category) || categoryId.get(host.category) || null,
      type: p.type,
      cover_url: p.cover_url,
      audience_level: 'beginner',
      plays_count: p.episodes.length * 260,
      rating_avg: 4.6,
    }));

    const insertedPods = await insertBatch('podcasts', podcastRows);
    podcastCount += insertedPods.length;

    for (let i = 0; i < host.podcasts.length; i++) {
      const pod = host.podcasts[i];
      const podcastId = insertedPods[i].id;

      for (let offset = 0; offset < pod.episodes.length; offset += 300) {
        const batch = pod.episodes.slice(offset, offset + 300).map((ep) => ({
          podcast_id: podcastId,
          title: ep.title,
          description: ep.description,
          audio_url: ep.audio_url,
          duration_seconds: ep.duration_seconds,
          published_at: ep.published_at,
          plays_count: ep.plays_count,
        }));
        await insertBatch('episodes', batch);
        episodeCount += batch.length;
      }
      process.stdout.write(`\r  ${host.name_ar}: ${i + 1}/${host.podcasts.length} shows, ${episodeCount} episodes   `);
    }
    console.log(`\n  ✓ ${host.name_ar}: ${host.podcasts.length} shows, ${host.podcasts.reduce((s, p) => s + p.episodes.length, 0)} episodes`);
  }

  return { hostCount, podcastCount, episodeCount };
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

const catalog = await buildCatalog();

console.log('\n================ SUMMARY ================');
let totalShows = 0;
let totalEpisodes = 0;
for (const host of catalog) {
  const eps = host.podcasts.reduce((sum, p) => sum + p.episodes.length, 0);
  totalShows += host.podcasts.length;
  totalEpisodes += eps;
  console.log(`${host.name_ar.padEnd(22)} shows=${String(host.podcasts.length).padStart(3)} eps=${String(eps).padStart(5)}`);
}
console.log(`TOTAL hosts=${catalog.length} shows=${totalShows} episodes=${totalEpisodes}`);

fs.writeFileSync(
  path.join(ROOT, 'supabase', 'catalog-preview.json'),
  JSON.stringify(
    catalog.map((h) => ({
      name_ar: h.name_ar,
      slug: h.slug,
      shows: h.podcasts.map((p) => ({ title: p.title, type: p.type, episodes: p.episodes.length })),
    })),
    null,
    2
  ),
  'utf8'
);

if (DRY) {
  console.log('\n(dry run — database untouched)');
} else if (totalEpisodes === 0) {
  console.log('\nNothing to import.');
} else {
  const result = await importCatalog(catalog);
  console.log('\n================ IMPORTED ================');
  console.log(result);
}
