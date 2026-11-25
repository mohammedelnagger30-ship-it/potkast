/**
 * Hand-checked presenters who actually have courses and episodes in Sada.
 *
 * No social links live here: every card opens the presenter's catalogue page,
 * because the carousel is about their content on this platform.
 */
export interface FeaturedPerson {
  name: string;
  title: string;
  specialty: string;
  photo: string;
  slug: string;
}

import { AHMED_ARABI_PHOTO } from './ahmedArabi';
import { BASEL_MOUNES_PHOTO } from './baselMounes';

export const FEATURED_HOSTS: FeaturedPerson[] = [
  {
    name: 'د. أحمد العربي',
    title: 'داعية ومحاضر',
    specialty: 'العبادات والتزكية',
    photo: AHMED_ARABI_PHOTO,
    slug: 'ahmed-arabi',
  },
  {
    name: 'م. باسل مؤنس',
    title: 'قارئ ومحاضر',
    specialty: 'التدبر والتلاوة — رحمه الله',
    photo: BASEL_MOUNES_PHOTO,
    slug: 'basel-mounes',
  },
  {
    name: 'أحمد الشقيري',
    title: 'إعلامي ومقدم برامج',
    specialty: 'تنمية بشرية وثقافة',
    photo:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Ahmad_Al-Shukairy_2010.jpg/500px-Ahmad_Al-Shugairi_2010.jpg',
    slug: 'ahmed-al-shugairi',
  },
  {
    name: 'ياسر الحزيمي',
    title: 'مؤلف ومقدم بودكاست',
    specialty: 'العلاقات وبناء الذات',
    photo: 'https://unavatar.io/x/ybh_100',
    slug: 'yasser-hizimi',
  },
  {
    name: 'بدر صالح',
    title: 'كوميديان ومقدم برامج',
    specialty: 'كوميديا وحوارات',
    photo: 'https://upload.wikimedia.org/wikipedia/commons/6/65/Bader_Saleh_Profile_Picture.jpg',
    slug: 'bader-saleh',
  },
  {
    name: 'مشهور الدبيان',
    title: 'رائد أعمال ومقدم بودكاست',
    specialty: 'سوالف بزنس وريادة الأعمال',
    photo: 'https://unavatar.io/x/dubayan',
    slug: 'mashhoor-aldubayan',
  },
  {
    name: 'د. خالد المنيف',
    title: 'مؤلف ومدرب',
    specialty: 'أسلوب حياة وتنمية ذات',
    photo: 'https://unavatar.io/x/khalids225',
    slug: 'khaled-almuneef',
  },
  {
    name: 'سجى الجلعود',
    title: 'مهندسة أمن معلومات ومقدمة',
    specialty: 'الأمن السيبراني',
    photo: 'https://unavatar.io/x/SajaAljulaud',
    slug: 'saja-aljulaud',
  },
  {
    name: 'د. أحمد عبد المنعم',
    title: 'باحث ومقدم',
    specialty: 'تفسير القرآن والتزكية',
    photo: 'https://unavatar.io/x/A_Abdelmonem82',
    slug: 'ahmed-abdelmoneim',
  },
  {
    name: 'هلال السيد',
    title: 'صحفي ومقدم',
    specialty: 'حوارات سياسية واجتماعية',
    photo:
      'https://image.simplecastcdn.com/images/ddd74822-e0f6-4d20-8913-82bbf7c2e21a/635121e5-c810-415b-bdf7-8bda6de85214/3000x3000/29536135-1713457889268-01d3a2a95268a.jpg?aid=rss_feed',
    slug: 'helal-elsayed',
  },
];
