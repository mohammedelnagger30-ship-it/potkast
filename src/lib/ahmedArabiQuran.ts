import type { Episode, Podcast } from '@/types/podcast';

/**
 * Public recitation source for د. أحمد العربي:
 * https://way2quran.com/ar/reciters/ahmed-al-arabi
 *
 * The page lists 48 available surahs (حفص عن عاصم) and exposes a public MP3
 * enclosure for each one. His official Telegram channel independently posts
 * recitations explicitly named «د. أحمد العربي», including several of these
 * surahs (الكهف، مريم، طه، الصف، الرعد...). Only the 48 published by the reciter
 * source are included here — no missing surah is invented or filled by another
 * reciter.
 */

export const AHMED_QURAN_SOURCE_URL = 'https://way2quran.com/ar/reciters/ahmed-al-arabi';
export const AHMED_QURAN_AUDIO_BASE = 'https://media.way2quran.com/ahmed-al-arabi/hafs-an-asim';
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

export const AHMED_QURAN_RECITATIONS: QuranRecitation[] = SURAHS.map(([surahNumber, title]) => ({
  id: `quran:ahmed-arabi:${String(surahNumber).padStart(3, '0')}`,
  surahNumber,
  title: `سورة ${title}`,
  audioUrl: `${AHMED_QURAN_AUDIO_BASE}/${String(surahNumber).padStart(3, '0')}.mp3`,
  sourceUrl: `${AHMED_QURAN_SOURCE_URL}#surah-${surahNumber}`,
}));

/**
 * Synthetic podcast wrapper only so the shared audio player can show a real
 * title/artwork. This is never written to Supabase and never appears in the
 * podcast catalogue.
 */
export const AHMED_QURAN_PODCAST: Podcast = {
  id: 'quran:ahmed-arabi',
  title: 'تلاوات د. أحمد العربي',
  description: 'تلاوات من المصحف الشريف بصوت د. أحمد العربي، برواية حفص عن عاصم.',
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
  description: `${recitation.title} — تلاوة بصوت د. أحمد العربي، برواية حفص عن عاصم.`,
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
