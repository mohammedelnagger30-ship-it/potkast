import type { Host } from '@/types/podcast';

/**
 * د. أحمد العربي — verified from his official Telegram channel
 * (https://t.me/Ahmed_Elaraby, 179K subscribers) and from the original
 * Simplecast episode feeds already stored in Sada.
 *
 * These are the Sada rows whose title/description name him. They stay in their
 * original shows (فاهم / بدون ورق) so those podcasts keep their real hosts —
 * this file only gathers his work under his own presenter profile.
 */

const AVATAR =
  'https://cdn4.telesco.pe/file/L3Ah5Pcj6ubfigYzV8UHI5uiCnsGbNdD6ubUtSI3rA_JjBDFM8X1F6TID7lwJ6zVub_4t5KDNPtNu4y3F21mVWXmSsbeod9ptBeaPZpEAZtdwd530aqnb0B8j-hmMZdsfRqNtEwQqpEdmekDY3NxlZEHyMz53HpZ4FSu90D7U4ufxgN1-pp7O9kNLo-0ItgXk6HgM3rRfOW0_rAsrB7pkAoXgla6EZ23k468yPPh-ylFhlUoM5PdNiogd5S6kHVS9ASOrsh7F1jevKeLFZf9dL94RzCUk8dZhHBrTuvfRc3ZTCbUwo4lln-Ga1Me7rado3At2OxmaxG-1RfWZBoEAA.jpg';
const CHANNEL_IMAGE =
  'https://cdn4.telesco.pe/file/qeiNSs1bDpDs3kCiKhyTbMXcfzHQ2W5veLQsWog4lnG96XPRwzKnXnOPx2CijFu7-wfsw_Rk0mwPeKVHk_WMIp742lNZ059ArhoWO6p0OjIvHt-xiX0yirvFMd8XIUXST8VfTnNW3w0du2KVhUtnDeKXeR_JKo3iGPIvwrBZ6oKn1KOC6BHe8hQHLcUkimda0hJwe6MOnViFwRneqYg5vajjSsjmeFX_o3W8zQjJM3gzRW_QU4b6UADLkbw7gCjko2NNuiD_hUzhykQ0NqLbHJ2q2Jg-7IYyrad5ysSfc_oE-n5XJR0iTt5_YwlmiWiVml6BqYuq7SmtI-0zPIE6Dg.jpg';
const FAHEM_COVER =
  'https://image.simplecastcdn.com/images/ddd74822-e0f6-4d20-8913-82bbf7c2e21a/635121e5-c810-415b-bdf7-8bda6de85214/3000x3000/29536135-1713457889268-01d3a2a95268a.jpg?aid=rss_feed';

export const AHMED_ARABI_PHOTO = AVATAR;
export const AHMED_ARABI_SLUG = 'ahmed-arabi';
export const AHMED_ARABI_HOST_ID = 'b1e57f4c-6d2a-4d0b-8a6f-3f6d0f0a5c11';
export const AHMED_ARABI_CATEGORY_ID = 'b6393bd3-deea-403f-88af-f7ae0b34736c';
export const AHMED_ARABI_SOURCE_URL = 'https://t.me/Ahmed_Elaraby';

export const AHMED_ARABI_HOST: Host = {
  id: AHMED_ARABI_HOST_ID,
  name_ar: 'د. أحمد العربي',
  slug: AHMED_ARABI_SLUG,
  photo_url: AVATAR,
  cover_url: CHANNEL_IMAGE,
  title_ar: '',
  specialty_ar: 'داعية ومحاضر — العبادات والتزكية',
  bio_ar:
    'داعية ومحاضر، حاصل على الماجستير في الفقه الإسلامي. يقدّم سلسلة «تذوق العبادات» و«رحلة الخلود» مع بودكاست فاهم، إلى جانب لقاءات ومحاضرات عن القلب السليم والتزكية وتلاوات قرآنية بصوته. قناته الرسمية الوحيدة: t.me/Ahmed_Elaraby.',
  country: 'مصر',
  category_id: AHMED_ARABI_CATEGORY_ID,
  is_verified: true,
  followers_count: 179000,
  social_links: {
    telegram: AHMED_ARABI_SOURCE_URL,
    quran: 'https://way2quran.com/ar/reciters/ahmed-al-arabi',
    youtube: 'https://youtube.com/@Drahmedelarabyofficial',
    instagram: 'https://instagram.com/drahmedelarabyofficial',
    facebook: 'https://facebook.com/drahmedelarabyofficial/',
  },
  created_at: '2026-11-25T00:00:00.000Z',
  category: {
    id: AHMED_ARABI_CATEGORY_ID,
    name_ar: 'روحاني / ديني',
    icon: '',
    color: '',
    created_at: '2026-11-25T00:00:00.000Z',
  },
};

export interface AhmedCourse {
  key: string;
  title: string;
  description: string;
  coverUrl: string;
  episodeIds: string[];
}

export const AHMED_ARABI_COURSES: AhmedCourse[] = [
  {
    key: 'tasting-worship',
    title: 'سلسلة تذوق العبادات',
    description:
      'أربع حلقات عن الصلاة والقرآن والدعاء والذكر: كيف تتحول العبادة من أداء حكمها إلى تذوّق معناها وباب للدخول على الله.',
    coverUrl: FAHEM_COVER,
    episodeIds: [
      '28a8a724-aa5a-4180-a003-8d30046340c5',
      'c3294549-1e07-4f59-b0a9-c68a683ed90c',
      'ddf5a224-80b0-4875-ae8e-62ac3c5029f8',
      '59b22732-50fe-4cbe-ab6e-835e95fb81de',
    ],
  },
  {
    key: 'journey-of-eternity',
    title: 'سلسلة رحلة الخلود',
    description:
      'رحلة ما بعد الموت: الموت ثم القبر، وما ينتظر الإنسان في البرزخ والبعث والمصير الأبدي.',
    coverUrl: FAHEM_COVER,
    episodeIds: [
      '95516406-ec25-47c1-bbed-a3420576ee95',
      '00c31a96-ae9b-4c48-a0c6-4dbcf200f3bf',
    ],
  },
];

export const AHMED_ARABI_SOLO_TITLE = 'لقاءات ومحاضرات أخرى';

/** Course label for every verified episode, in the order it should appear. */
export const AHMED_ARABI_EPISODE_TITLES: Array<{ id: string; course: string }> = [
  ...AHMED_ARABI_COURSES.flatMap((course) =>
    course.episodeIds.map((id) => ({ id, course: course.title }))
  ),
  {
    id: '0de87e72-d7af-46c6-8698-1399b62544aa',
    course: AHMED_ARABI_SOLO_TITLE,
  },
  {
    id: 'd8c4ee4f-aeec-470c-b822-78344b9ee228',
    course: AHMED_ARABI_SOLO_TITLE,
  },
];

export const AHMED_ARABI_EPISODE_IDS = AHMED_ARABI_EPISODE_TITLES.map((item) => item.id);

export function ahmedCourseForEpisode(id: string): string {
  return AHMED_ARABI_EPISODE_TITLES.find((item) => item.id === id)?.course || AHMED_ARABI_SOLO_TITLE;
}
