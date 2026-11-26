import type { Episode, Host, Podcast } from '@/types/podcast';

/**
 * المهندس إبراهيم حجازي (Zigoo0) — خبير أمن معلومات مصري، مؤسس مشارك وCTO في
 * DarkEntry. لا يوجد مصحف بصوته، لذلك لا تضاف له تلاوات قرآنية على الإطلاق.
 *
 * الحلقات الخمس أدناه حقيقية ومسموعة بصوته، وهي لقاءات ظهر فيها كضيف في
 * برامج أخرى. كل حلقة تظل منسوبة لبرنامجها الأصلي، ولا يُدعى أنه مقدّمها.
 *
 * المصادر (فُحصت 2026-11-26):
 *  - قناته الرسمية https://www.youtube.com/@Zigoo0 وحسابه https://x.com/Zigoo0
 *  - PodCAT:        https://anchor.fm/s/8d27bd9c/podcast/rss
 *  - دروس:          https://anchor.fm/s/70850d5c/podcast/rss
 *  - سكيوريتي بالعربي: https://anchor.fm/s/d38680e8/podcast/rss
 * كل روابط MP3 عامة وغير مؤقتة، ورجّعت 206 بفحص نطاق بايت. لا توجد روابط
 * Telegram تنتهي صلاحيتها ولا ملفات صوت منسوبة لشخص آخر.
 *
 * هذه صفوف client-side فقط؛ لا يُعاد تعريف أي بودكاست أو حلقة في Supabase.
 */

export const EBRAHIM_HEGAZY_SLUG = 'ibrahim-hegazy';
export const EBRAHIM_HEGAZY_HOST_ID = '2f0d4a78-3c91-4b6e-9a17-5d8c2e4b7f13';
export const EBRAHIM_HEGAZY_CATEGORY_ID = 'efbf528a-6b44-4878-a023-f0e1e40300c0';
export const EBRAHIM_HEGAZY_PHOTO =
  'https://yt3.googleusercontent.com/ytc/AIdro_na2IVjWCbShQCWauJvq2BlaEN-hj2wSTiN_FwsxUdomuE=s900-c-k-c0x00ffffff-no-rj';
export const EBRAHIM_HEGAZY_SOURCE_URL = 'https://www.youtube.com/@Zigoo0';
export const EBRAHIM_HEGAZY_X_URL = 'https://x.com/Zigoo0';
export const EBRAHIM_HEGAZY_LINKEDIN_URL = 'https://www.linkedin.com/in/ebrahimhegazy/';
export const EBRAHIM_HEGAZY_WEBSITE_URL = 'https://darkentry.net/';

export const EBRAHIM_HEGAZY_HOST: Host = {
  id: EBRAHIM_HEGAZY_HOST_ID,
  name_ar: 'إبراهيم حجازي',
  slug: EBRAHIM_HEGAZY_SLUG,
  photo_url: EBRAHIM_HEGAZY_PHOTO,
  cover_url: EBRAHIM_HEGAZY_PHOTO,
  title_ar: 'المهندس',
  specialty_ar: 'خبير الأمن السيبراني — Zigoo0',
  bio_ar:
    'خبير أمن معلومات مصري (Zigoo0)، مؤسس مشارك ومدير تقني في DarkEntry، وعالم ثغرات يعمل في مجال حماية المعلومات منذ ٢٠١٣. الحلقات هنا لقاءات ظهر فيها بصوته في برامج: PodCAT، بودكاست دروس، وسكيوريتي بالعربي — وهي منسوبة لبرامجها الأصلية، وليست حلقات يقدّمها. قناته: youtube.com/@Zigoo0.',
  country: 'مصر',
  category_id: EBRAHIM_HEGAZY_CATEGORY_ID,
  is_verified: true,
  followers_count: 34800,
  social_links: {
    youtube: EBRAHIM_HEGAZY_SOURCE_URL,
    twitter: EBRAHIM_HEGAZY_X_URL,
    linkedin: EBRAHIM_HEGAZY_LINKEDIN_URL,
    website: EBRAHIM_HEGAZY_WEBSITE_URL,
  },
  created_at: '2026-11-26T00:00:00.000Z',
  category: {
    id: EBRAHIM_HEGAZY_CATEGORY_ID,
    name_ar: 'التقنية',
    icon: '',
    color: '',
    created_at: '2026-11-26T00:00:00.000Z',
  },
};

const PODCAT_COVER =
  'https://d3t3ozftmdmh3i.cloudfront.net/staging/podcast_uploaded_nologo/23581919/23581919-1710444887590-d392b6020c17a.jpg';
const DROOS_COVER =
  'https://d3t3ozftmdmh3i.cloudfront.net/production/podcast_uploaded/18777679/18777679-1634741485692-9d7045931db48.jpg';
const SECURITY_COVER =
  'https://d3t3ozftmdmh3i.cloudfront.net/staging/podcast_uploaded_nologo/35388074/35388074-1733413260793-9b06b2cc66e2b.jpg';

/** Real shows that published these interviews, each kept with its own name. */
const PODCAT: Podcast = {
  id: 'curated:hegazy:podcast:podcat',
  title: 'PodCAT',
  description: 'بودكاست PodCAT — لقاءات تقنية وأمنية.',
  host_name: 'PodCAT',
  host_bio: '',
  host_id: null,
  plays_count: 0,
  rating_avg: 0,
  category_id: EBRAHIM_HEGAZY_CATEGORY_ID,
  type: 'professional',
  cover_url: PODCAT_COVER,
  audience_level: 'beginner',
  created_at: '2026-11-26T00:00:00.000Z',
};

const DROOS: Podcast = {
  id: 'curated:hegazy:podcast:droos',
  title: 'Droos Podcast - بودكاست دروس',
  description: 'بودكاست دروس — حلقات ولقاءات في التنمية والتقنية.',
  host_name: 'بودكاست دروس',
  host_bio: '',
  host_id: null,
  plays_count: 0,
  rating_avg: 0,
  category_id: EBRAHIM_HEGAZY_CATEGORY_ID,
  type: 'professional',
  cover_url: DROOS_COVER,
  audience_level: 'beginner',
  created_at: '2026-11-26T00:00:00.000Z',
};

const SECURITY_ARABIC: Podcast = {
  id: 'curated:hegazy:podcast:security-arabic',
  title: 'سكيوريتي بالعربي',
  description: 'سكيوريتي بالعربي — حلقات عن الأمن السيبراني وأمن المعلومات.',
  host_name: 'سكيوريتي بالعربي',
  host_bio: '',
  host_id: null,
  plays_count: 0,
  rating_avg: 0,
  category_id: EBRAHIM_HEGAZY_CATEGORY_ID,
  type: 'professional',
  cover_url: SECURITY_COVER,
  audience_level: 'beginner',
  created_at: '2026-11-26T00:00:00.000Z',
};

export interface HegazyProgram {
  key: string;
  title: string;
  description: string;
  coverUrl: string;
  episodeIds: string[];
}

interface InterviewDef {
  key: string;
  title: string;
  show: Podcast;
  program: string;
  sourceUrl: string;
  audioUrl: string;
  durationSeconds: number;
  publishedAt: string;
}

/** Exact titles, durations and dates read from the official RSS enclosures. */
const INTERVIEWS: InterviewDef[] = [
  {
    key: 'podcat-s03e01',
    title: 'PodCAT S03 E01 | Cyber Security for Everyone: Ebrahem Hegazy',
    show: PODCAT,
    program: 'podcat',
    sourceUrl: 'https://anchor.fm/s/8d27bd9c/podcast/rss',
    audioUrl: 'https://d3ctxlq1ktw2nl.cloudfront.net/staging/2025-2-6/396076400-44100-2-c42313d2458a4.mp3',
    durationSeconds: 3804,
    publishedAt: '2025-03-06T19:30:00.000Z',
  },
  {
    key: 'droos-hackers',
    title: 'مش ابراهيم حجازي: لا يوجد جهاز آمن من الاختراق، كيف تحمي نفسك من الهاكرز؟',
    show: DROOS,
    program: 'droos',
    sourceUrl: 'https://anchor.fm/s/70850d5c/podcast/rss',
    audioUrl: 'https://d3ctxlq1ktw2nl.cloudfront.net/staging/2024-1-17/367739012-44100-2-69b4d678863ea.mp3',
    durationSeconds: 11019,
    publishedAt: '2024-02-17T17:03:30.000Z',
  },
  {
    key: 'droos-watched',
    title: 'مش ابراهيم حجازي ٢: احذر أنت مراقب طول الوقت',
    show: DROOS,
    program: 'droos',
    sourceUrl: 'https://anchor.fm/s/70850d5c/podcast/rss',
    audioUrl: 'https://d3ctxlq1ktw2nl.cloudfront.net/staging/2025-10-2/410465829-44100-2-15511404717d7.mp3',
    durationSeconds: 8091,
    publishedAt: '2025-11-03T14:42:00.000Z',
  },
  {
    key: 'security-darkentry',
    title: 'DarkEntry - إبراهيم حجازي',
    show: SECURITY_ARABIC,
    program: 'security',
    sourceUrl: 'https://anchor.fm/s/d38680e8/podcast/rss',
    audioUrl: 'https://d3ctxlq1ktw2nl.cloudfront.net/staging/2024-4-25/8a029bf7-5efb-1583-6e4f-6f235903b1e0.mp3',
    durationSeconds: 3104,
    publishedAt: '2024-05-25T17:35:58.000Z',
  },
  {
    key: 'security-bugbounty',
    title: 'Bug Bounty - إبراهيم حجازي',
    show: SECURITY_ARABIC,
    program: 'security',
    sourceUrl: 'https://anchor.fm/s/d38680e8/podcast/rss',
    audioUrl: 'https://d3ctxlq1ktw2nl.cloudfront.net/staging/2023-1-26/439e704c-725d-1d30-6617-3f283a651a02.mp3',
    durationSeconds: 1961,
    publishedAt: '2023-02-26T17:34:12.000Z',
  },
];

const interviewId = (key: string) => `curated:hegazy:${key}`;

export const EBRAHIM_HEGAZY_EPISODES: Episode[] = INTERVIEWS.map((item) => ({
  id: interviewId(item.key),
  podcast_id: item.show.id,
  title: item.title,
  description: `لقاء ظهر فيه المهندس إبراهيم حجازي (Zigoo0) بصوته في برنامج ${item.show.title}. الحلقة كاملة من مصدرها الأصلي: ${item.sourceUrl}`,
  audio_url: item.audioUrl,
  duration_seconds: item.durationSeconds,
  plays_count: 0,
  published_at: item.publishedAt,
  image_url: item.show.cover_url,
  podcast: item.show,
}));

export const EBRAHIM_HEGAZY_PROGRAMS: HegazyProgram[] = [
  {
    key: 'podcat',
    title: 'PodCAT — لقاء إبراهيم حجازي',
    description:
      'حلقة كاملة من PodCAT عن الأمن السيبراني للجميع، مع المهندس إبراهيم حجازي كضيف.',
    coverUrl: PODCAT_COVER,
    episodeIds: INTERVIEWS.filter((item) => item.program === 'podcat').map((item) => interviewId(item.key)),
  },
  {
    key: 'droos',
    title: 'بودكاست دروس — لقاءات إبراهيم حجازي',
    description:
      'لقاءان من بودكاست دروس: كيف تحمي نفسك من الهاكرز، ولماذا أنت مراقب طول الوقت.',
    coverUrl: DROOS_COVER,
    episodeIds: INTERVIEWS.filter((item) => item.program === 'droos').map((item) => interviewId(item.key)),
  },
  {
    key: 'security',
    title: 'سكيوريتي بالعربي — مع إبراهيم حجازي',
    description:
      'حلقتان من سكيوريتي بالعربي: لقاء عن شركة DarkEntry، وحلقة عن صيد الثغرات Bug Bounty.',
    coverUrl: SECURITY_COVER,
    episodeIds: INTERVIEWS.filter((item) => item.program === 'security').map((item) => interviewId(item.key)),
  },
];

export const EBRAHIM_HEGAZY_SOURCES = [
  { label: 'قناته الرسمية', url: EBRAHIM_HEGAZY_SOURCE_URL },
  { label: 'PodCAT', url: 'https://anchor.fm/s/8d27bd9c/podcast/rss' },
  { label: 'بودكاست دروس', url: 'https://anchor.fm/s/70850d5c/podcast/rss' },
  { label: 'سكيوريتي بالعربي', url: 'https://anchor.fm/s/d38680e8/podcast/rss' },
];

export function hegazyProgramForEpisode(id: string): string {
  const programKey = INTERVIEWS.find((item) => interviewId(item.key) === id)?.program;
  return EBRAHIM_HEGAZY_PROGRAMS.find((program) => program.key === programKey)?.title || '';
}
