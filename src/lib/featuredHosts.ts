/**
 * Hand-checked featured presenters.
 *
 * Every entry is a real, named presenter with a public, verifiable presence.
 * The `source` string is shown as the card tooltip so the listing can be
 * audited instead of relying on seed-data follower numbers.
 */
export interface FeaturedPerson {
  name: string;
  title: string;
  specialty: string;
  photo: string;
  /** Internal host profile when the presenter is part of the catalogue. */
  slug?: string;
  /** Official public profile for presenters who are not catalogued yet. */
  url?: string;
  source: string;
}

export const FEATURED_HOSTS: FeaturedPerson[] = [
  {
    name: 'أحمد الشقيري',
    title: 'إعلامي ومقدم برامج',
    specialty: 'تنمية بشرية وثقافة',
    photo:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Ahmad_Al-Shukairy_2010.jpg/500px-Ahmad_Al-Shugairi_2010.jpg',
    slug: 'ahmed-al-shugairi',
    source: 'Instagram 17M · Facebook 20.7M · X 18.2M — حساباته الرسمية / Wikidata',
  },
  {
    name: 'باسم يوسف',
    title: 'كوميديان ومقدم برامج',
    specialty: 'كوميديا وحوارات',
    photo: 'https://upload.wikimedia.org/wikipedia/commons/3/3f/Bassem_Youssef.jpg',
    url: 'https://www.instagram.com/bassem/',
    source: 'Instagram 8M · Facebook 7.5M (نحو 16M متابع) — حساباته الرسمية',
  },
  {
    name: 'ياسر الحزيمي',
    title: 'مؤلف ومقدم بودكاست',
    specialty: 'العلاقات وبناء الذات',
    photo: 'https://unavatar.io/x/ybh_100',
    slug: 'yasser-hizimi',
    source: 'Instagram 5M — الحساب الرسمي @ybh.100',
  },
  {
    name: 'بدر صالح',
    title: 'كوميديان ومقدم برامج',
    specialty: 'كوميديا وحوارات',
    photo: 'https://upload.wikimedia.org/wikipedia/commons/6/65/Bader_Saleh_Profile_Picture.jpg',
    slug: 'bader-saleh',
    source: 'YouTube 2.6M · X 1.8M · Instagram 1M — ويكيبيديا وحساباته الرسمية',
  },
  {
    name: 'مشهور الدبيان',
    title: 'رائد أعمال ومقدم بودكاست',
    specialty: 'سوالف بزنس وريادة الأعمال',
    photo: 'https://unavatar.io/x/dubayan',
    slug: 'mashhoor-aldubayan',
    source: 'صاحب بودكاست «سوالف بزنس» — الحساب الموثّق @dubayan',
  },
  {
    name: 'عبدالرحمن أبومالح',
    title: 'مؤسس ومقدم بودكاست فنجان',
    specialty: 'حوارات وثقافة',
    photo: 'https://unavatar.io/x/abumalih',
    url: 'https://x.com/abumalih',
    source: 'مقدم «فنجان» — حلقة واحدة حقّقت 166M مشاهدة على يوتيوب',
  },
  {
    name: 'د. خالد المنيف',
    title: 'مؤلف ومدرب',
    specialty: 'أسلوب حياة وتنمية ذات',
    photo: 'https://unavatar.io/x/khalids225',
    slug: 'khaled-almuneef',
    source: 'Instagram 71K — الحساب الرسمي @khalids225',
  },
  {
    name: 'سجى الجلعود',
    title: 'مهندسة أمن معلومات ومقدمة',
    specialty: 'الأمن السيبراني',
    photo: 'https://unavatar.io/x/SajaAljulaud',
    slug: 'saja-aljulaud',
    source: 'مقدمة «كلام سايبر» — الحساب الموثّق @SajaAljulaud',
  },
  {
    name: 'د. أحمد عبد المنعم',
    title: 'باحث ومقدم',
    specialty: 'تفسير القرآن والتزكية',
    photo: 'https://i1.sndcdn.com/avatars-000038390708-0tx7sk-t500x500.jpg',
    slug: 'ahmed-abdelmoneim',
    source: 'قناة «إنه القرآن» — محتوى موثّق بصوته وصورته',
  },
  {
    name: 'هلال السيد',
    title: 'صحفي ومقدم',
    specialty: 'حوارات سياسية واجتماعية',
    photo:
      'https://image.simplecastcdn.com/images/ddd74822-e0f6-4d20-8913-82bbf7c2e21a/635121e5-c810-415b-bdf7-8bda6de85214/3000x3000/29536135-1713457889268-01d3a2a95268a.jpg?aid=rss_feed',
    slug: 'helal-elsayed',
    source: 'مقدم بودكاست «فاهم» — الحساب الرسمي للبرنامج',
  },
];
