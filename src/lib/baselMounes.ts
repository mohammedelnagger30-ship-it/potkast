import type { Episode, Host, Podcast } from '@/types/podcast';

/**
 * م. باسل محمد مؤنس (رحمه الله) — presenter catalogue assembled only from
 * public, source-labelled audio files.
 *
 * Sources:
 *  - His own Telegram channel, تلاوات ودروس باسل مؤنس: https://t.me/ttbasil
 *    (39,280 subscribers). The official إنه القرآن channel republishes his
 *    lessons and recitations with his name: https://t.me/itsthequraan
 *  - Internet Archive items whose titles/descriptions name him and whose MP3
 *    enclosures are public and stable. Every URL below was checked with a
 *    byte-range request and returned 200/206 on 2026-11-25.
 *
 * Repeated uploads of the same lesson are kept once. The ambiguous file
 * `mgls_fe_rsaa...d._ahmd_al3rbe.mp3` is excluded because it is a message
 * about د. أحمد العربي, not a verified lesson by باسل مؤنس.
 *
 * Nothing here is written to Supabase: these are client-side curated rows so
 * no real podcast host or Sada episode is relabelled.
 */

export const BASEL_MOUNES_SLUG = 'basel-mounes';
export const BASEL_MOUNES_HOST_ID = 'd8a9c4f2-7b61-4e30-a95c-6f2e1b7d408a';
export const BASEL_MOUNES_CATEGORY_ID = 'b6393bd3-deea-403f-88af-f7ae0b34736c';
export const BASEL_MOUNES_SOURCE_URL = 'https://t.me/ttbasil';
export const BASEL_MOUNES_ARCHIVE_URL = 'https://archive.org/details/basil-mounes';

export const BASEL_MOUNES_PHOTO =
  'https://cdn4.telesco.pe/file/CI5VTOPv585fu6hP3s0YCUe3v1gz0FVkejvpy2qkWWCAPg03TJUuWwLnOhVKBvNEuE0EzmEr6VW4iU68BitZ4gW4hYtnfxOolgrgggaFPL8CbfoPHBqJ1UTQ0AH3r2dSShY_-U_vWU3bxk_dq1FOBf6_vfrdjOGuU4pnjqOczkpuQ_LNuBoazWOpSVmilU-_bfTg6WOj0cz5qUnQj1AxlxkO8509vHwVXWrVuy7YWFU4LKKvgmcbi7wuSaMy2JfKcEq2k3IFWGCH3QjoOl0gHwnlKNLiCbkoPgt6oGcW4xh0a5mwVk2IHFJWgE5LoVt8U_zsrUQyQzQTnr0fsrwVVA.jpg';
const LESSON_COVER = 'https://archive.org/services/img/basel_mo2nes';
const QURAN_COVER = 'https://archive.org/services/img/basil-mounes';

export const BASEL_MOUNES_HOST: Host = {
  id: BASEL_MOUNES_HOST_ID,
  name_ar: 'م. باسل مؤنس',
  slug: BASEL_MOUNES_SLUG,
  photo_url: BASEL_MOUNES_PHOTO,
  cover_url: QURAN_COVER,
  title_ar: 'قارئ ومحاضر',
  specialty_ar: 'التدبر والتلاوة — رحمه الله',
  bio_ar:
    'م. باسل محمد مؤنس (رحمه الله)، قارئ ومحاضر مصري عُرف بتلاوته الخاشعة ومجالسه في تدبر القرآن. تلاواته ودروسه منشورة في قناته «تلاوات ودروس باسل مؤنس»، وتنشر قناة «إنه القرآن» الرسمية محاضراته باسمه. كل ما هنا من ملفات صوت عامة موثّقة، والدروس والتلاوات معروضة منفصلة.',
  country: 'مصر',
  category_id: BASEL_MOUNES_CATEGORY_ID,
  is_verified: true,
  followers_count: 39280,
  social_links: {
    telegram: BASEL_MOUNES_SOURCE_URL,
    quran: BASEL_MOUNES_ARCHIVE_URL,
  },
  created_at: '2026-11-25T00:00:00.000Z',
  category: {
    id: BASEL_MOUNES_CATEGORY_ID,
    name_ar: 'روحاني / ديني',
    icon: '',
    color: '',
    created_at: '2026-11-25T00:00:00.000Z',
  },
};

/** Synthetic podcast wrapper so the shared player can show artwork/title. */
export const BASEL_MOUNES_PODCAST: Podcast = {
  id: 'curated:basel-mounes:talks',
  title: 'دروس م. باسل مؤنس',
  description: 'دروس ومحاضرات ومجالس تدبر بصوت م. باسل محمد مؤنس، رحمه الله.',
  host_name: 'م. باسل مؤنس',
  host_bio: '',
  host_id: null,
  plays_count: 0,
  rating_avg: 0,
  category_id: BASEL_MOUNES_CATEGORY_ID,
  type: 'religious',
  cover_url: LESSON_COVER,
  audience_level: 'beginner',
  created_at: '2026-11-25T00:00:00.000Z',
};

const archiveUrl = (item: string, file: string) =>
  `https://archive.org/download/${item}/${encodeURIComponent(file)}`;

interface LessonDef {
  key: string;
  title: string;
  item: string;
  file: string;
  course: string;
}

const LESSONS: LessonDef[] = [
  { key: 'qossas-1', title: 'تدبر سورة القصص — المجلس ١', item: 'media-way2allah-_1538', file: '١-_tdbr_swra_alkss_-_m.basl_mons.mp3', course: 'qossas' },
  { key: 'qossas-2', title: 'تدبر سورة القصص — المجلس ٢', item: 'media-way2allah-_1538', file: '٢-_tdbr_swra_alkss_-_m.basl_mons.mp3', course: 'qossas' },
  { key: 'qossas-3', title: 'تدبر سورة القصص — المجلس ٣', item: 'media-way2allah-_1538', file: '٣-_tdbr_swra_alkss_-_m.basl_mons.mp3', course: 'qossas' },
  { key: 'qossas-4', title: 'تدبر سورة القصص — المجلس ٤', item: 'media-way2allah-_1538', file: '٤-_tdbr_swra_alkss_-_m.basl_mons.mp3', course: 'qossas' },
  { key: 'qossas-5', title: 'تدبر سورة القصص — المجلس ٥', item: 'media-way2allah-_1538', file: '٥-_tdbr_swra_alkss_-_m.basl_mons.mp3', course: 'qossas' },
  { key: 'qossas-6', title: 'تدبر سورة القصص — المجلس ٦', item: 'media-way2allah-_1538', file: '٦-_tdbr_swra_alkss_-_m.basl_mons.mp3', course: 'qossas' },
  { key: 'qossas-7', title: 'تدبر سورة القصص — المجلس ٧', item: 'media-way2allah-_1538', file: '٧-_tdbr_swra_alkss_-_m.basl_mons.mp3', course: 'qossas' },
  { key: 'qossas-8', title: 'تدبر سورة القصص — المجلس ٨', item: 'media-way2allah-_1538', file: '٨-_tdbr_swra_alkss_-_m.basl_mons.mp3', course: 'qossas' },
  { key: 'qossas-9', title: 'تدبر سورة القصص — المجلس ٩', item: 'media-way2allah-_1538', file: '٩_-_tdbr_swra_alkss_-_m.basl_mons.mp3', course: 'qossas' },
  { key: 'qossas-10', title: 'تدبر سورة القصص — المجلس ١٠', item: 'media-way2allah-_1538', file: '١٠_-_tdbr_swra_alkss_-_m.basl_mons.mp3', course: 'qossas' },
  { key: 'qossas-11', title: 'تدبر سورة القصص — المجلس ١١', item: 'media-way2allah-_1538', file: '١١_-_tdbr_swra_alkss_-_m.basl_mons.mp3', course: 'qossas' },

  { key: 'waqfat-tariq', title: 'وقفات مع سورة الطارق', item: 'basel_mo2nes', file: 'wkfat_m3_swra_altark-_.mp3', course: 'waqfat' },
  { key: 'waqfat-shams', title: 'وقفات مع سورة الشمس', item: 'basel_mo2nes', file: 'wkfat_m3_swra_alshms-_.mp3', course: 'waqfat' },
  { key: 'waqfat-layl', title: 'وقفات مع سورة الليل', item: 'basel_mo2nes', file: 'wkfat_m3_swra_allel-_.mp3', course: 'waqfat' },
  { key: 'waqfat-ala', title: 'وقفات مع سورة الأعلى', item: 'basel_mo2nes', file: 'wkfat_m3_swra_ala3le-_.mp3', course: 'waqfat' },
  { key: 'waqfat-balad', title: 'وقفات مع سورة البلد', item: 'basel_mo2nes', file: 'wkfat_m3_swra_albld-_.mp3', course: 'waqfat' },
  { key: 'waqfat-ghashiya', title: 'وقفات مع سورة الغاشية', item: 'basel_mo2nes', file: 'wkfat_m3_swra_alghashea-_.mp3', course: 'waqfat' },
  { key: 'waqfat-fajr', title: 'وقفات مع سورة الفجر', item: 'basel_mo2nes', file: 'wkfat_m3_swra_alfgr-_.mp3', course: 'waqfat' },
  { key: 'waqfat-duha-1', title: 'وقفات مع سورة الضحى (١)', item: 'basel_mo2nes', file: 'wkfat_m3_swra_aldhe_1-_.mp3', course: 'waqfat' },
  { key: 'waqfat-duha-2', title: 'استكمال وقفات مع سورة الضحى (٢)', item: 'basel_mo2nes', file: 'astkmal_wkfat_m3_swra_aldhe_2-_.mp3', course: 'waqfat' },
  { key: 'waqfat-layali', title: 'وليال عشر', item: 'basel_mo2nes', file: 'wleal_3shr____.mp3', course: 'waqfat' },

  { key: 'omar-zamam', title: 'الآن يا عمر، املك زمام نفسك', item: 'basel_mo2nes', file: 'alan_ea_3mr_amlk_zmam_nfsk_____m_basl_mons.mp3', course: 'misc' },
  { key: 'qawl-thaqil', title: 'إنا سنلقي عليك قولاً ثقيلاً', item: 'basel_mo2nes', file: 'ena_snlke_3lek_kwla_skela____m_.basl_mons.mp3', course: 'misc' },
  { key: 'tadabbur-sharh', title: 'تدبر سورة الشرح', item: 'basel_mo2nes', file: 'tder_swra_alshrh____m_basl_mons.mp3', course: 'misc' },
  { key: 'fatab-alayh', title: 'فتاب عليه', item: 'basel_mo2nes', file: 'ftab_3leh_-_.mp3', course: 'misc' },
  { key: 'liyahaqq-alhaqq', title: 'ليحق الحق', item: 'basel_mo2nes', file: 'lehk_alhk-_.mp3', course: 'misc' },
  { key: 'maqasid-adhkar', title: 'مقاصد الأذكار', item: 'basel_mo2nes', file: 'mkasd_alazkar_-_.mp3', course: 'misc' },
  { key: 'samina-watana', title: 'سمعنا وأطعنا', item: 'basel_mo2nes', file: 'sm3na_wat3na__.mp3', course: 'misc' },
  { key: 'dua-shuqya', title: 'ولم أكن بدعائك رب شقياً', item: 'basel_mo2nes', file: 'wlm_akn_bd3aeak_rb_shkea_..mp3', course: 'misc' },
  { key: 'ittibat-alquran', title: 'الذين يستمعون القول فيتبعون أحسنه — الارتباط بالقرآن ١٤٤٤', item: 'basel_mo2nes', file: 'alzen_estm3wn_alkwl_fetb3wn_ahsnh___alartbat_balkran_1444___.mp3', course: 'misc' },
  { key: 'kayfa-natadabbar', title: 'كيف نتدبر القرآن', item: 'media-way2allah-_3436', file: 'kef_ntdbr_alkran_basl_mons_-_rhmh_allh_-_enh_alkran.mp3', course: 'misc' },
  { key: 'hadith-hanzala', title: 'حديث حنظلة', item: 'media-way2allah-_3562', file: 'hdes_hnzla_basl_mons_-_rhmh_allh_-_enh_alkran.mp3', course: 'misc' },
  { key: 'waqfat-siyam', title: 'وقفات مع آيات الصيام', item: 'media-way2allah-_3562', file: 'wkfat_m3_aeat_alseam_basl_mons_-_rhmh_allh_-_enh_alkran.mp3', course: 'misc' },
  { key: 'laylat-alqadr', title: 'ليلة القدر', item: 'media-way2allah-_2713', file: 'lela_alkdr_-_basl_mons_rhmh_allh.mp3', course: 'misc' },
  { key: 'tastakhisir', title: 'ما تستخسرش في القرآن', item: 'media-way2allah-_2711', file: 'matstkhsrsh_fe_alkran_-_basl_mons_rhmh_allh.mp3', course: 'misc' },
  { key: 'ramadan-ayat', title: 'وقفات مع آيات الصيام — الترك لرمضان', item: 'media-way2allah-_1538', file: '١٢-_wkfat_m3_aeat_alseam_-_altrek_lrmdan_-_m._basl_mons.mp3', course: 'misc' },
  { key: 'ramadan-prep', title: 'نتدبر القرآن — الاستعداد لرمضان', item: 'media-way2allah-_1538', file: '٦-_azae_ntdbr_alkran_-_alast3dad_lrmdan_-_m_basl_mons.mp3', course: 'misc' },
  { key: 'ashab-al-ukhdud', title: 'قتل أصحاب الأخدود', item: 'media-way2allah-_1538', file: 'rfka_-_m._basl_monn_ktl_ashb_ٱlakhdwd.mp3', course: 'misc' },
  { key: 'sadaq-allah-1', title: 'وصدق الله ورسوله (١)', item: 'media-way2allah-_1538', file: 'wsdk_allh_wrswlh_١_-_m_.basl_mons.mp3', course: 'misc' },
  { key: 'sadaq-allah-2', title: 'وصدق الله ورسوله (٢)', item: 'media-way2allah-_1538', file: 'wsdk_allh_wrswlh_٢_-_m_.basl_mons.mp3', course: 'misc' },
  { key: 'sadaq-allah-3', title: 'وصدق الله ورسوله (٣)', item: 'media-way2allah-_1538', file: 'wsdk_allh_wrswlh_٣_-_m_._basl_mons.mp3', course: 'misc' },
];

const lessonId = (key: string) => `curated:basel:lesson:${key}`;

export const BASEL_MOUNES_EPISODES: Episode[] = LESSONS.map((lesson) => ({
  id: lessonId(lesson.key),
  podcast_id: BASEL_MOUNES_PODCAST.id,
  title: lesson.title,
  description: `${lesson.title} — درس بصوت م. باسل محمد مؤنس، رحمه الله. المصدر: ${BASEL_MOUNES_SOURCE_URL}`,
  audio_url: archiveUrl(lesson.item, lesson.file),
  duration_seconds: 0,
  plays_count: 0,
  published_at: '2026-11-25T00:00:00.000Z',
  image_url: LESSON_COVER,
  podcast: BASEL_MOUNES_PODCAST,
}));

export interface BaselCourse {
  key: string;
  title: string;
  description: string;
  coverUrl: string;
  episodeIds: string[];
}

export const BASEL_MOUNES_COURSES: BaselCourse[] = [
  {
    key: 'qossas',
    title: 'تدبر سورة القصص',
    description:
      'إحدى عشرة مجلساً في تدبر سورة القصص، يمرّ فيها باسل مؤنس مع قصص القرآن ودلالاتها للقلب المؤمن.',
    coverUrl: LESSON_COVER,
    episodeIds: LESSONS.filter((l) => l.course === 'qossas').map((l) => lessonId(l.key)),
  },
  {
    key: 'waqfat',
    title: 'وقفات مع سور القرآن',
    description:
      'وقفات مختصرة مع سور جزء عمّ: الطارق والشمس والليل والأعلى والبلد والغاشية والفجر والضحى.',
    coverUrl: LESSON_COVER,
    episodeIds: LESSONS.filter((l) => l.course === 'waqfat').map((l) => lessonId(l.key)),
  },
  {
    key: 'misc',
    title: 'محاضرات ومجالس متفرقة',
    description:
      'محاضرات ومجالس مستقلة: تدبر القرآن، مقاصد الأذكار، التوبة، حديث حنظلة، الاستعداد لرمضان، وصدق الله ورسوله، وليلة القدر، وغيرها. حُذفت النسخ المكررة من الأرشيف.',
    coverUrl: LESSON_COVER,
    episodeIds: LESSONS.filter((l) => l.course === 'misc').map((l) => lessonId(l.key)),
  },
];

export const BASEL_MOUNES_SOLO_TITLE = 'محاضرات ومجالس متفرقة';

export const BASEL_MOUNES_EPISODE_TITLES: Array<{ id: string; course: string }> = LESSONS.map((lesson) => ({
  id: lessonId(lesson.key),
  course:
    lesson.course === 'qossas'
      ? 'تدبر سورة القصص'
      : lesson.course === 'waqfat'
        ? 'وقفات مع سور القرآن'
        : BASEL_MOUNES_SOLO_TITLE,
}));

export function baselCourseForEpisode(id: string): string {
  return BASEL_MOUNES_EPISODE_TITLES.find((item) => item.id === id)?.course || BASEL_MOUNES_SOLO_TITLE;
}

/**
 * 70 surahs with a public MP3 by باسل مؤنس on Internet Archive. The numbered
 * item `basil-mounes` supplies 68; two more come from the labelled
 * «المصحف المرتل - باسل مؤنس» item. No other reciter is used to fill gaps.
 */
export interface BaselQuranRecitation {
  id: string;
  surahNumber: number;
  title: string;
  audioUrl: string;
  sourceUrl: string;
  fileName: string;
}

type SurahRow = [number, string, string, string];
const QURAN_SURAHS: SurahRow[] = [
  [1, 'سورة الفاتحة', 'basil-mounes', '001.mp3'],
  [2, 'سورة البقرة', 'basil-mounes', '002.mp3'],
  [4, 'سورة النساء', 'basil-mounes', '004.mp3'],
  [7, 'سورة الأعراف', 'basil-mounes', '007.mp3'],
  [8, 'سورة الأنفال', 'basil-mounes', '008.mp3'],
  [9, 'سورة التوبة', 'basil-mounes', '009.mp3'],
  [11, 'سورة هود', 'basil-mounes', '011.mp3'],
  [14, 'سورة إبراهيم', 'basil-mounes', '014.mp3'],
  [15, 'سورة الحجر', 'basil-mounes', '015.mp3'],
  [16, 'سورة النحل', 'basil-mounes', '016.mp3'],
  [18, 'سورة الكهف', 'basil-mounes', '018.mp3'],
  [20, 'سورة طه', 'basil-mounes', '020.mp3'],
  [22, 'سورة الحج', 'basil-mounes', '022.mp3'],
  [23, 'سورة المؤمنون', 'basil-mounes', '023.mp3'],
  [25, 'سورة الفرقان', 'basil-mounes', '025.mp3'],
  [28, 'سورة القصص', 'basil-mounes', '028.mp3'],
  [29, 'سورة العنكبوت', 'basil-mounes', '029.mp3'],
  [30, 'سورة الروم', 'basil-mounes', '030.mp3'],
  [31, 'سورة لقمان', 'basil-mounes', '031.mp3'],
  [33, 'سورة الأحزاب (الآيات ١–٢٤)', '20260530_20260530_2140', 'سورة الأحزاب-من 1 إلى 24- باسل مؤنس.mp3'],
  [34, 'سورة سبأ', 'basil-mounes', '034.mp3'],
  [35, 'سورة فاطر', 'basil-mounes', '035.mp3'],
  [36, 'سورة يس', '20260530_20260530_2140', 'سورة يس-باسل مؤنس.mp3'],
  [37, 'سورة الصافات', 'basil-mounes', '037.mp3'],
  [42, 'سورة الشورى', 'basil-mounes', '042.mp3'],
  [43, 'سورة الزخرف', 'basil-mounes', '043.mp3'],
  [44, 'سورة الدخان', 'basil-mounes', '044.mp3'],
  [46, 'سورة الأحقاف', 'basil-mounes', '046.mp3'],
  [47, 'سورة محمد', 'basil-mounes', '047.mp3'],
  [50, 'سورة ق', 'basil-mounes', '050.mp3'],
  [52, 'سورة الطور', 'basil-mounes', '052.mp3'],
  [53, 'سورة النجم', 'basil-mounes', '053.mp3'],
  [54, 'سورة القمر', 'basil-mounes', '054.mp3'],
  [55, 'سورة الرحمن', 'basil-mounes', '055.mp3'],
  [56, 'سورة الواقعة', 'basil-mounes', '056.mp3'],
  [57, 'سورة الحديد', 'basil-mounes', '057.mp3'],
  [59, 'سورة الحشر', 'basil-mounes', '059.mp3'],
  [60, 'سورة الممتحنة', 'basil-mounes', '060.mp3'],
  [61, 'سورة الصف', 'basil-mounes', '061.mp3'],
  [62, 'سورة الجمعة', 'basil-mounes', '062.mp3'],
  [63, 'سورة المنافقون', 'basil-mounes', '063.mp3'],
  [64, 'سورة التغابن', 'basil-mounes', '064.mp3'],
  [67, 'سورة الملك', 'basil-mounes', '067.mp3'],
  [68, 'سورة القلم', 'basil-mounes', '068.mp3'],
  [69, 'سورة الحاقة', 'basil-mounes', '069.mp3'],
  [73, 'سورة المزمل', 'basil-mounes', '073.mp3'],
  [74, 'سورة المدثر', 'basil-mounes', '074.mp3'],
  [75, 'سورة القيامة', 'basil-mounes', '075.mp3'],
  [77, 'سورة المرسلات', 'basil-mounes', '077.mp3'],
  [78, 'سورة النبأ', 'basil-mounes', '078.mp3'],
  [82, 'سورة الانفطار', 'basil-mounes', '082.mp3'],
  [83, 'سورة المطففين', 'basil-mounes', '083.mp3'],
  [84, 'سورة الانشقاق', 'basil-mounes', '084.mp3'],
  [85, 'سورة البروج', 'basil-mounes', '085.mp3'],
  [86, 'سورة الطارق', 'basil-mounes', '086.mp3'],
  [87, 'سورة الأعلى', 'basil-mounes', '087.mp3'],
  [88, 'سورة الغاشية', 'basil-mounes', '088.mp3'],
  [89, 'سورة الفجر', 'basil-mounes', '089.mp3'],
  [90, 'سورة البلد', 'basil-mounes', '090.mp3'],
  [91, 'سورة الشمس', 'basil-mounes', '091.mp3'],
  [92, 'سورة الليل', 'basil-mounes', '092.mp3'],
  [93, 'سورة الضحى', 'basil-mounes', '093.mp3'],
  [99, 'سورة الزلزلة', 'basil-mounes', '099.mp3'],
  [103, 'سورة العصر', 'basil-mounes', '103.mp3'],
  [106, 'سورة قريش', 'basil-mounes', '106.mp3'],
  [107, 'سورة المعون', 'basil-mounes', '107.mp3'],
  [109, 'سورة الكافرون', 'basil-mounes', '109.mp3'],
  [112, 'سورة الإخلاص', 'basil-mounes', '112.mp3'],
  [113, 'سورة الفلق', 'basil-mounes', '113.mp3'],
  [114, 'سورة الناس', 'basil-mounes', '114.mp3'],
];

export const BASEL_MOUNES_QURAN_RECITATIONS: BaselQuranRecitation[] = QURAN_SURAHS.map(
  ([surahNumber, title, item, fileName]) => ({
    id: `quran:basel-mounes:${String(surahNumber).padStart(3, '0')}`,
    surahNumber,
    title,
    audioUrl: archiveUrl(item, fileName),
    sourceUrl: `https://archive.org/details/${item}`,
    fileName,
  })
);

export const BASEL_MOUNES_QURAN_PODCAST: Podcast = {
  id: 'quran:basel-mounes',
  title: 'تلاوات م. باسل مؤنس',
  description: 'تلاوات من المصحف الشريف بصوت م. باسل محمد مؤنس، رحمه الله.',
  host_name: 'م. باسل مؤنس',
  host_bio: '',
  host_id: null,
  plays_count: 0,
  rating_avg: 0,
  category_id: BASEL_MOUNES_CATEGORY_ID,
  type: 'religious',
  cover_url: QURAN_COVER,
  audience_level: 'beginner',
  created_at: '2026-11-25T00:00:00.000Z',
};

export const BASEL_MOUNES_QURAN_EPISODES: Episode[] = BASEL_MOUNES_QURAN_RECITATIONS.map((recitation) => ({
  id: recitation.id,
  podcast_id: BASEL_MOUNES_QURAN_PODCAST.id,
  title: recitation.title,
  description: `${recitation.title} — تلاوة بصوت م. باسل محمد مؤنس، رحمه الله.`,
  audio_url: recitation.audioUrl,
  duration_seconds: 0,
  plays_count: 0,
  published_at: '2026-11-25T00:00:00.000Z',
  image_url: QURAN_COVER,
  podcast: BASEL_MOUNES_QURAN_PODCAST,
}));
