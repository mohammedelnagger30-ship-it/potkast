import type { Host } from '@/types/podcast';

/**
 * د. هشام عصمت — verified public presenter profile.
 *
 * Checked 2026-11-26:
 * - official YouTube channel: https://www.youtube.com/@DrHeshamEsmat
 * - public video index: https://www.drheshamesmat.com/ (fan-made; embeds the
 *   original YouTube videos and explicitly says it is not the official site)
 * - the channel avatar and banner load directly from yt3.googleusercontent.com.
 *
 * No stable unsigned MP3/RSS feed was found for this catalogue. His lessons
 * and interviews therefore remain YouTube videos opened with YouTube's own
 * player (see heshamEsmatVideos.ts). Nothing here invents audio episodes,
 * episode counts, or listening history.
 */

export const HESHAM_ESMAT_SLUG = 'hesham-esmat';
export const HESHAM_ESMAT_HOST_ID = 'c9a2e77b-1d4a-4d2f-9a5e-7b0c4f26a1d3';
export const HESHAM_ESMAT_PHOTO =
  'https://yt3.googleusercontent.com/bwOY3aQgbFXSMijSQxAzB0vln0epNT1WU28gxOe0bgBvJYfmN4XzekVF9zrbKS42rbbXsAjug90=s900-c-k-c0x00ffffff-no-rj';
export const HESHAM_ESMAT_COVER =
  'https://yt3.googleusercontent.com/N2ravDpn6yKliYdWdjLxMROvPUYlvovakoWbq2PyKA6S6k9wSqTnwDphugt0-pAyykvNexARvWo=w1707-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj';
export const HESHAM_ESMAT_SOURCE_URL = 'https://www.youtube.com/@DrHeshamEsmat';
export const HESHAM_ESMAT_INDEX_URL = 'https://www.drheshamesmat.com/';
export const HESHAM_ESMAT_QUESTALKS_URL = 'https://www.youtube.com/watch?v=UAH8ka92Y5Y';

export const HESHAM_ESMAT_HOST: Host = {
  id: HESHAM_ESMAT_HOST_ID,
  name_ar: 'هشام عصمت',
  slug: HESHAM_ESMAT_SLUG,
  photo_url: HESHAM_ESMAT_PHOTO,
  cover_url: HESHAM_ESMAT_COVER,
  title_ar: 'الدكتور',
  specialty_ar: 'طبيب ومحاضر العلوم الطبية الأساسية',
  bio_ar:
    'طبيب ومحاضر مصري يشرح الكيمياء الحيوية والأحياء الدقيقة لطلاب كليات الطب، ويقدّم حلقات في السيرة النبوية ومقاطع توعوية قصيرة. محاضراته ولقاءاته المتاحة بصوته على يوتيوب؛ لا توجد ملفات صوت ثابتة منشورة باسمه يمكن تشغيلها هنا، لذلك لا تُضاف كحلقات صوت في سدى.',
  country: 'مصر',
  category_id: null,
  is_verified: true,
  followers_count: 38600,
  social_links: {
    youtube: HESHAM_ESMAT_SOURCE_URL,
  },
  created_at: '2026-11-26T00:00:00.000Z',
  category: {
    id: '',
    name_ar: 'العلوم',
    icon: 'FlaskConical',
    color: '#0EA5E9',
    created_at: '2026-11-26T00:00:00.000Z',
  },
};

export const HESHAM_ESMAT_SOURCES = [
  { label: 'قناته الرسمية على يوتيوب', url: HESHAM_ESMAT_SOURCE_URL },
  { label: 'دليل محاضراته (موقع محبيه)', url: HESHAM_ESMAT_INDEX_URL },
  { label: 'لقاء Questalks', url: HESHAM_ESMAT_QUESTALKS_URL },
];
