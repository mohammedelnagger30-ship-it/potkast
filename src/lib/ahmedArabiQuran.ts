import type { Episode, Podcast } from '@/types/podcast';

/**
 * Public recitation sources for د. أحمد العربي:
 *
 *  - https://way2quran.com/ar/reciters/ahmed-al-arabi — 48 surahs, حفص عن عاصم.
 *  - https://anchor.fm/s/108df6110/podcast/rss — the show «تلاوات د.أحمد العربي»
 *    (https://open.spotify.com/show/730UBFWPWLj4cXUEoTK5mS). 33 further surahs
 *    have public, unsigned CloudFront MP3 enclosures and titles/creator tags
 *    naming د.أحمد العربي. Some are tarawih/mosque recordings, so their style
 *    differs from the studio way2quran set. The same feed also contains clearly
 *    labelled «ما تيسر» clips for otherwise missing surahs; those are included
 *    with their exact ayah ranges in the title and are never presented as a
 *    complete surah.
 *
 * Every URL below was checked with a byte-range request and returned 200/206.
 * No missing surah is filled by another reciter.
 */

export const AHMED_QURAN_SOURCE_URL = 'https://way2quran.com/ar/reciters/ahmed-al-arabi';
export const AHMED_QURAN_EXTRA_SOURCE_URL = 'https://anchor.fm/s/108df6110/podcast/rss';
export const AHMED_QURAN_AUDIO_BASE = 'https://media.way2quran.com/ahmed-al-arabi/hafs-an-asim';
export const AHMED_QURAN_EXTRA_AUDIO_BASE = 'https://d3ctxlq1ktw2nl.cloudfront.net/staging/';
export const AHMED_QURAN_COVER =
  'https://media.way2quran.com/imgs/ahmed-al-arabi.jpg?v=1778524551698';

export interface QuranRecitation {
  id: string;
  surahNumber: number;
  title: string;
  audioUrl: string;
  sourceUrl: string;
}

const SURAHS: Array<[number, string]> = [
  [1, 'الفاتحة'],
  [2, 'البقرة'],
  [3, 'آل عمران'],
  [4, 'النساء'],
  [5, 'المائدة'],
  [6, 'الأنعام'],
  [7, 'الأعراف'],
  [8, 'الأنفال'],
  [10, 'يونس'],
  [12, 'يوسف'],
  [13, 'الرعد'],
  [15, 'الحجر'],
  [16, 'النحل'],
  [18, 'الكهف'],
  [19, 'مريم'],
  [20, 'طه'],
  [21, 'الأنبياء'],
  [25, 'الفرقان'],
  [27, 'النمل'],
  [30, 'الروم'],
  [31, 'لقمان'],
  [32, 'السجدة'],
  [33, 'الأحزاب'],
  [34, 'سبأ'],
  [35, 'فاطر'],
  [36, 'يس'],
  [37, 'الصافات'],
  [38, 'ص'],
  [39, 'الزمر'],
  [40, 'غافر'],
  [42, 'الشورى'],
  [43, 'الزخرف'],
  [46, 'الأحقاف'],
  [49, 'الحجرات'],
  [50, 'ق'],
  [51, 'الذاريات'],
  [52, 'الطور'],
  [53, 'النجم'],
  [54, 'القمر'],
  [55, 'الرحمن'],
  [56, 'الواقعة'],
  [69, 'الحاقة'],
  [72, 'الجن'],
  [75, 'القيامة'],
  [79, 'النازعات'],
  [87, 'الأعلى'],
  [89, 'الفجر'],
  [93, 'الضحى'],
];

/** Complete surahs from his public Anchor/Spotify recitation feed. */
const EXTRA_SURAHS: Array<[number, string, string]> = [
  [14, 'إبراهيم', '2026-2-12/7be85308-222f-49ba-9e24-bcad227dd3f9.mp3'],
  [22, 'الحج', '2026-2-7/7ca79ba3-d605-575c-b5bb-31749900cd16.mp3'],
  [47, 'محمد', '2026-0-8/c9751bca-1eed-8f37-6e64-25036520f7d1.mp3'],
  [48, 'الفتح', '2026-1-13/fec29ea4-f4a4-c355-cb63-27d88faef5a6.mp3'],
  [60, 'الممتحنة', '2026-3-25/f5798ffd-9567-3d09-c565-3f2efacbe5c0.mp3'],
  [61, 'الصف', '2026-1-19/fab1e6a0-ee7d-798f-0c84-6ec29361f699.mp3'],
  [63, 'المنافقون', '2026-5-11/6d262179-c85c-bd45-82cd-930b56cd2d66.mp3'],
  [64, 'التغابن', '2026-2-4/6d7fc011-2333-8440-e902-54b6b9f811ca.mp3'],
  [65, 'الطلاق', '2026-4-5/125b7c05-4027-a743-8b29-ff229c76ae1f.mp3'],
  [66, 'التحريم', '2026-3-25/d5e081e3-3d1a-6b43-1643-f2a5fb0be7f4.mp3'],
  [67, 'الملك', '2026-6-28/21309c62-92be-0cd4-b891-fdcab6f0509a.mp3'],
  [70, 'المعارج', '2026-2-4/72be3187-61f2-6b03-e40c-9fef1d469925.mp3'],
  [71, 'نوح', '2026-5-18/8b8af281-6391-7c66-0f9e-35f297d3813c.mp3'],
  [73, 'المزمل', '2026-3-10/8c2ffac4-7088-1441-bfbf-ff81aa78d45e.mp3'],
  [74, 'المدثر', '2026-3-5/4abb6750-0366-2db0-90df-1efe1034e7ce.mp3'],
  [76, 'الإنسان', '2026-1-25/d8ab6a85-b262-628c-8344-19edaa83a15c.mp3'],
  [77, 'المرسلات', '2026-8-1/2afeb941-2b3d-aa3d-b41e-b4f2a856a207.mp3'],
  [78, 'النبأ', '2026-5-18/62a0538c-826d-5008-f7ef-3241c9a96a9f.mp3'],
  [80, 'عبس', '2026-3-27/3ab64435-5ca7-51d0-7d70-5cfa1e92cc10.mp3'],
  [81, 'التكوير', '2026-4-5/010443b1-4135-a61d-a0ba-dfe91c0a8675.mp3'],
  [82, 'الانفطار', '2026-7-3/6eed0089-eae6-4282-0451-8f391253a420.mp3'],
  [83, 'المطففين', '2026-5-11/21729e74-c952-d4a0-2025-d0b281bc3730.mp3'],
  [84, 'الانشقاق', '2026-7-3/bfac2187-2941-3703-bb94-fd670570213f.mp3'],
  [85, 'البروج', '2026-6-28/d4a31d76-ebf7-3791-47fc-b5004ce3e77a.mp3'],
  [86, 'الطارق', '2026-2-4/648516f9-d5bc-d9ba-9ed0-bbd133dbb6dc.mp3'],
  [90, 'البلد', '2026-7-3/d5fb4d00-b3dd-900f-0bee-0d19dd07641f.mp3'],
  [91, 'الشمس', '2026-5-18/3c3d2dcc-b23a-894b-fd4a-056700ec378d.mp3'],
  [94, 'الشرح', '2026-7-3/d303dd45-7ea1-e11f-9e60-1a6660965748.mp3'],
  [95, 'التين', '2026-7-3/8ed3b900-bf67-6406-0d52-6765b5dd14d5.mp3'],
  [96, 'العلق', '2026-7-3/e7d503e5-78fa-00fb-4150-3575ef54534e.mp3'],
  [97, 'القدر', '2026-7-3/65ae33db-90b4-22ac-a5a1-57a77a74f49b.mp3'],
  [98, 'البينة', '2026-7-3/407d10fd-4e05-874a-fb9c-3ab4f7060baf.mp3'],
  [99, 'الزلزلة', '2026-7-3/47c64ce8-87d5-7335-24ca-69268279ade1.mp3'],
];

/**
 * Explicitly partial «ما تيسر» clips for surahs with no complete recording
 * found. The RSS description states the exact ayah range for each one.
 * Overlapping clips for the same surah are reduced to the longest one.
 */
const PARTIAL_SURAHS: Array<[number, string, string, string]> = [
  [11, 'هود', 'الآيات ٩٦–١٢٣', '2025-8-16/7857586e-087e-af61-3cd1-6674033981a6.mp3'],
  [23, 'المؤمنون', 'الآيات ٩٣–١١٨', '2025-8-27/d40a23bd-d4bb-66da-e2bf-83894380b461.mp3'],
  [24, 'النور', 'الآيات ١–٣٤', '2026-8-26/88806be9-de96-7421-94fd-1b05b8d0e941.m4a'],
  [28, 'القصص', 'الآيات ٢٠–٢٨', '2025-11-2/79ef99a4-a661-3a4d-90bc-234293f89397.mp3'],
  [41, 'فصلت', 'الآيات ٤٧–٥٤', '2026-3-5/c4b3f997-f2c7-44b3-d612-0e63d1aa3bab.mp3'],
];

const recitationId = (surahNumber: number) =>
  `quran:ahmed-arabi:${String(surahNumber).padStart(3, '0')}`;

export const AHMED_QURAN_RECITATIONS: QuranRecitation[] = [
  ...SURAHS.map(([surahNumber, title]) => ({
    id: recitationId(surahNumber),
    surahNumber,
    title: `سورة ${title}`,
    audioUrl: `${AHMED_QURAN_AUDIO_BASE}/${String(surahNumber).padStart(3, '0')}.mp3`,
    sourceUrl: `${AHMED_QURAN_SOURCE_URL}#surah-${surahNumber}`,
  })),
  ...EXTRA_SURAHS.map(([surahNumber, title, path]) => ({
    id: recitationId(surahNumber),
    surahNumber,
    title: `سورة ${title}`,
    audioUrl: `${AHMED_QURAN_EXTRA_AUDIO_BASE}${path}`,
    sourceUrl: `${AHMED_QURAN_EXTRA_SOURCE_URL}#surah-${surahNumber}`,
  })),
  ...PARTIAL_SURAHS.map(([surahNumber, title, range, path]) => ({
    id: `${recitationId(surahNumber)}-p`,
    surahNumber,
    title: `سورة ${title} (ما تيسر: ${range})`,
    audioUrl: `${AHMED_QURAN_EXTRA_AUDIO_BASE}${path}`,
    sourceUrl: `${AHMED_QURAN_EXTRA_SOURCE_URL}#partial-${surahNumber}`,
  })),
].sort((a, b) => a.surahNumber - b.surahNumber);

/**
 * Synthetic podcast wrapper only so the shared audio player can show a real
 * title/artwork. This is never written to Supabase and never appears in the
 * podcast catalogue.
 */
export const AHMED_QURAN_PODCAST: Podcast = {
  id: 'quran:ahmed-arabi',
  title: 'تلاوات د. أحمد العربي',
  description: 'تلاوات من المصحف الشريف بصوت د. أحمد العربي، من مصادر منشورة باسمه.',
  host_name: 'د. أحمد العربي',
  host_bio: '',
  host_id: null,
  plays_count: 0,
  rating_avg: 0,
  category_id: 'b6393bd3-deea-403f-88af-f7ae0b34736c',
  type: 'religious',
  cover_url: AHMED_QURAN_COVER,
  audience_level: 'beginner',
  created_at: '2026-11-25T00:00:00.000Z',
};

export const AHMED_QURAN_EPISODES: Episode[] = AHMED_QURAN_RECITATIONS.map((recitation) => ({
  id: recitation.id,
  podcast_id: AHMED_QURAN_PODCAST.id,
  title: recitation.title,
  description: `${recitation.title} — تلاوة بصوت د. أحمد العربي.`,
  audio_url: recitation.audioUrl,
  duration_seconds: 0,
  plays_count: 0,
  published_at: '2026-11-25T00:00:00.000Z',
  image_url: AHMED_QURAN_COVER,
  podcast: AHMED_QURAN_PODCAST,
}));

export function isQuranRecitationId(id?: string | null): boolean {
  return !!id && id.startsWith('quran:');
}
