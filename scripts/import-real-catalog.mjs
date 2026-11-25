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
const APPEND = process.argv.includes('--append');

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
  {
    artist: "Shady Sherif",
    name_ar: "شادي شريف",
    slug: "shady-sherif",
    title_ar: "",
    specialty_ar: "ريادة وأعمال",
    country: "مصر",
    type: "professional",
    feeds: ["https://feeds.simplecast.com/P_WLLgQ6"],
  },
  {
    artist: "Podcast Record",
    name_ar: "بودكاست ريكورد",
    slug: "podcast-record",
    title_ar: "",
    specialty_ar: "كتب وقصص صوتية",
    country: "مصر",
    type: "cultural",
    feeds: ["https://feeds.simplecast.com/_WdSsSAO", "https://feeds.simplecast.com/h6juYMNL", "https://feeds.simplecast.com/0KaqgeVz", "https://feeds.simplecast.com/_1G3PqYA", "https://feeds.simplecast.com/wvmOJpdI", "https://feeds.simplecast.com/FCVRKWzw", "https://feeds.simplecast.com/h4RlzwYd", "https://feeds.simplecast.com/NO_5zJz8", "https://feeds.simplecast.com/wEBsqdJR"],
  },
  {
    artist: "Anas Bukhash",
    name_ar: "أنس بخاش",
    slug: "anas-bukhash",
    title_ar: "",
    specialty_ar: "حوارات وريادة",
    country: "الإمارات",
    type: "professional",
    artistId: "1447390504",
    feeds: ["https://feeds.megaphone.fm/ab-podcasts"],
  },
  {
    artist: "فيصل العقل",
    name_ar: "فيصل العقل",
    slug: "faisal-al-aql",
    title_ar: "",
    specialty_ar: "كتب ومراجعات",
    country: "السعودية",
    type: "cultural",
    artistId: "1524870892",
    feeds: ["https://feeds.simplecast.com/_rXD2gwQ", "https://feeds.simplecast.com/7tAuRFcD"],
  },
  {
    artist: "فانز قصص رون",
    name_ar: "قصص رون",
    slug: "rones-stories",
    title_ar: "",
    specialty_ar: "قصص وأطفال",
    country: "السعودية",
    type: "kids",
    feeds: ["https://anchor.fm/s/ed521618/podcast/rss"],
  },
  {
    artist: "Dr. Tareq Al Suwaidan",
    name_ar: "طارق السويدان",
    slug: "tareq-alsuwaidan",
    title_ar: "",
    specialty_ar: "تاريخ وسيرة",
    country: "الكويت",
    type: "history",
    feeds: ["https://anchor.fm/s/3568c164/podcast/rss"],
  },
  {
    artist: "Ahmed Rashad",
    name_ar: "أحمد رشاد",
    slug: "ahmed-rashad",
    title_ar: "",
    specialty_ar: "أعمال وريادة",
    country: "مصر",
    type: "professional",
    artistId: "1508007989",
    feeds: ["https://rss.buzzsprout.com/758528.rss", "https://feeds.redcircle.com/8ca86dec-a4df-46f0-bc86-a1208cc85772", "https://feeds.redcircle.com/87d4f31c-1252-4fb1-998a-b4afe49ba7c7", "https://feeds.redcircle.com/848c9c3c-38e1-4660-8b97-99027b5ee77a"],
  },
  {
    artist: "منتدى الشرق",
    name_ar: "منتدى الشرق",
    slug: "al-sharq",
    title_ar: "",
    specialty_ar: "حوارات وثقافة",
    country: "الكويت",
    type: "cultural",
    feeds: ["https://www.omnycontent.com/d/playlist/93ede1a5-f219-4562-a4af-b0c100d3da54/b99de37c-3f73-49c9-be75-b0c200c457ef/8575cfdf-6506-4d39-962e-b0c200c706c3/podcast.rss"],
  },
  {
    artist: "بودكاست أبجورة",
    name_ar: "أبجورة",
    slug: "abjoora",
    title_ar: "",
    specialty_ar: "ثقافة ومجتمع",
    country: "السعودية",
    type: "cultural",
    feeds: ["https://feeds.soundcloud.com/users/soundcloud:users:92059239/sounds.rss"],
  },
  {
    artist: "الخِزانة الإسلامية",
    name_ar: "الخزانة الإسلامية",
    slug: "alkhizana",
    title_ar: "",
    specialty_ar: "كتب ومحاضرات إسلامية",
    country: "السعودية",
    type: "religious",
    feeds: ["https://anchor.fm/s/1141ac2b8/podcast/rss", "https://anchor.fm/s/116c918ac/podcast/rss"],
  },
  {
    artist: "مجتمع Mujtama",
    name_ar: "مجتمع",
    slug: "mujtama",
    title_ar: "",
    specialty_ar: "قيم ومجتمع",
    country: "السعودية",
    type: "religious",
    feeds: ["https://www.spreaker.com/show/6242417/episodes/feed"],
  },
  {
    artist: "DUPAMICAFFEINE",
    name_ar: "دوباميكافين",
    slug: "dopamicaffeine",
    title_ar: "",
    specialty_ar: "علوم مبسطة",
    country: "السعودية",
    type: "scientific",
    feeds: ["https://feeds.acast.com/public/shows/66b69b4dbda5e2df147feba2"],
  },
  {
    artist: "Mohammad AlZayed",
    name_ar: "محمد الزايد",
    slug: "mohammad-alzayed",
    title_ar: "",
    specialty_ar: "ثقافة ومجتمع",
    country: "السعودية",
    type: "cultural",
    feeds: ["https://feeds.simplecast.com/laoJKC7u"],
  },
  {
    artist: "Atheer ~ أثير",
    name_ar: "أثير",
    slug: "atheer",
    title_ar: "",
    specialty_ar: "قصص وثقافة",
    country: "الأردن",
    type: "cultural",
    artistId: "1458126450",
    feeds: ["https://www.omnycontent.com/d/playlist/9c074afa-3313-47e8-b802-a9f900789975/ba51e3d3-5dc7-4b7f-8936-ad07011f1ad1/a8b2a3b0-c14d-4e1e-bc04-ad0701206af8/podcast.rss", "https://www.omnycontent.com/d/playlist/9c074afa-3313-47e8-b802-a9f900789975/3eff11f3-e4ef-4a6f-9716-aa0f008bb0e8/0fd96dfb-9a95-4297-9405-aa0f008cba64/podcast.rss", "https://www.omnycontent.com/d/playlist/9c074afa-3313-47e8-b802-a9f900789975/ec8f12a1-c4e4-4e9a-8f18-ab8d01045046/223c0538-58f8-4692-846d-ab8d010534b9/podcast.rss", "https://www.omnycontent.com/d/playlist/9c074afa-3313-47e8-b802-a9f900789975/eb3f597e-9cab-4c0b-9572-aa1300e2665c/6ea6737e-2530-4497-a4c2-aa1300e2933c/podcast.rss", "https://www.omnycontent.com/d/playlist/9c074afa-3313-47e8-b802-a9f900789975/e54931fc-28a8-4b63-85fa-ab05007b29a8/13f1f6de-b3cf-436f-adce-ab0500824437/podcast.rss", "https://www.omnycontent.com/d/playlist/9c074afa-3313-47e8-b802-a9f900789975/7b2130d4-47ff-4252-ae6a-aacb00edd1a7/14a09289-2829-42e0-a72f-aacb00efb127/podcast.rss"],
  },
  {
    artist: "PaperSamwich ساندوتش ورقي",
    name_ar: "ساندوتش ورقي",
    slug: "papersamwich",
    title_ar: "",
    specialty_ar: "تعليم ومراجعات",
    country: "الإمارات",
    type: "scientific",
    feeds: ["https://feeds.simplecast.com/NlA3hEnl"],
  },
  {
    artist: "Sky News Arabia سكاي نيوز عربية",
    name_ar: "سكاي نيوز عربية",
    slug: "sky-news-arabia",
    title_ar: "",
    specialty_ar: "إعلام وثقافة",
    country: "الإمارات",
    type: "cultural",
    artistId: "1563279438",
    feeds: ["https://www.spreaker.com/show/4562941/episodes/feed", "https://www.spreaker.com/show/4562924/episodes/feed", "https://www.spreaker.com/show/4562952/episodes/feed", "https://www.spreaker.com/show/4562946/episodes/feed", "https://www.spreaker.com/show/4562942/episodes/feed", "https://www.spreaker.com/show/4564494/episodes/feed", "https://www.spreaker.com/show/4562958/episodes/feed", "https://www.spreaker.com/show/4562943/episodes/feed", "https://www.spreaker.com/show/4562907/episodes/feed", "https://www.spreaker.com/show/4562945/episodes/feed", "https://www.spreaker.com/show/4611418/episodes/feed", "https://www.spreaker.com/show/4562951/episodes/feed", "https://www.spreaker.com/show/4562938/episodes/feed", "https://www.spreaker.com/show/3689131/episodes/feed", "https://www.spreaker.com/show/4562956/episodes/feed", "https://www.spreaker.com/show/4592259/episodes/feed", "https://www.spreaker.com/show/4603255/episodes/feed", "https://www.spreaker.com/show/4562963/episodes/feed", "https://www.spreaker.com/show/4562964/episodes/feed", "https://www.spreaker.com/show/4562911/episodes/feed", "https://www.spreaker.com/show/3689146/episodes/feed", "https://www.spreaker.com/show/4564564/episodes/feed"],
  },
  {
    artist: "Ghmza غمزة",
    name_ar: "غمزة",
    slug: "ghmza",
    title_ar: "",
    specialty_ar: "ثقافة ومجتمع",
    country: "السعودية",
    type: "cultural",
    feeds: ["https://media.podeo.co/rss/MTE5NjM"],
  },
  {
    artist: "Aware Media",
    name_ar: "أوير ميديا",
    slug: "aware-media",
    title_ar: "",
    specialty_ar: "قصص ومجتمع",
    country: "الأردن",
    type: "cultural",
    feeds: ["https://feeds.simplecast.com/WXTXomHX"],
  },
  {
    artist: "Sausan fahad",
    name_ar: "سوسن فهد",
    slug: "sausan-fahad",
    title_ar: "",
    specialty_ar: "وعي وتطوير",
    country: "السعودية",
    type: "psychology",
    feeds: ["https://media.podeo.co/rss/MTc3NDg"],
  },
  {
    artist: "Podeo | بوديو",
    name_ar: "بوديو",
    slug: "podeo",
    title_ar: "",
    specialty_ar: "دين وتاريخ",
    country: "الإمارات",
    type: "religious",
    feeds: ["https://media.podeo.co/rss/MjU1OTQ"],
  },
  {
    artist: "عبدالرحمن حجازي",
    name_ar: "عبدالرحمن حجازي",
    slug: "abdelrahman-hegazy",
    title_ar: "",
    specialty_ar: "تعليم لغات",
    country: "مصر",
    type: "scientific",
    feeds: ["https://anchor.fm/s/daec7284/podcast/rss", "https://feeds.soundcloud.com/users/soundcloud:users:672776474/sounds.rss"],
  },
  {
    artist: "Kerning Cultures Network",
    name_ar: "كيرننغ كالتشرز",
    slug: "kerning",
    title_ar: "",
    specialty_ar: "بودكاست عربي",
    country: "الإمارات",
    type: "cultural",
    artistId: "1473347856",
    feeds: ["https://feeds.acast.com/public/shows/64c14fa0495c9f0011924d29", "https://feeds.acast.com/public/shows/6441990f425b3100113a6690", "https://feeds.acast.com/public/shows/64419ab073010400119f985e", "https://feeds.acast.com/public/shows/64418d054561b100111aca36", "https://feeds.acast.com/public/shows/647e218bf71ff8001115415b", "https://feeds.acast.com/public/shows/64419b7aa189ca00113245a1", "https://feeds.acast.com/public/shows/647e1597fd4cb90011c317b1", "https://feeds.acast.com/public/shows/649b2eb5b7fba40011e8a551", "https://feeds.acast.com/public/shows/64419424a189ca001130f76a", "https://feeds.acast.com/public/shows/64419c8c73010400119fee99", "https://feeds.acast.com/public/shows/64419d84c9ba5a0011b21e84", "https://feeds.acast.com/public/shows/64418fdbc9ba5a0011af9750"],
  },
  {
    artist: "Arabcast",
    name_ar: "عربي كاست",
    slug: "arabcast",
    title_ar: "",
    specialty_ar: "علوم وقصص",
    country: "الأردن",
    type: "scientific",
    feeds: ["https://anchor.fm/s/104d697b4/podcast/rss", "https://anchor.fm/s/e58a6bb0/podcast/rss"],
  },
  {
    artist: "مذكرة تنفّس",
    name_ar: "مذكرة تنفس",
    slug: "tanafos",
    title_ar: "",
    specialty_ar: "صحة نفسية",
    country: "السعودية",
    type: "psychology",
    feeds: ["https://anchor.fm/s/10475cf24/podcast/rss"],
  },
  {
    artist: "Dana Hamdi",
    name_ar: "دانه حمدي",
    slug: "dana-hamdi",
    title_ar: "",
    specialty_ar: "صحة نفسية",
    country: "الأردن",
    type: "psychology",
    feeds: ["https://anchor.fm/s/8d936d94/podcast/rss", "https://anchor.fm/s/f7913154/podcast/rss"],
  },
  {
    artist: "سامر مصطفى",
    name_ar: "سامر مصطفى",
    slug: "samer-mostafa",
    title_ar: "",
    specialty_ar: "تقنية وبرمجة",
    country: "مصر",
    type: "technology",
    feeds: ["https://anchor.fm/s/163b9b90/podcast/rss", "https://anchor.fm/s/d59c6960/podcast/rss"],
  },
  {
    artist: "TAFKIQ/تـــفـــكــــيـــك",
    name_ar: "تفكيك",
    slug: "tafkiq",
    title_ar: "",
    specialty_ar: "فلسفة وفكر",
    country: "السعودية",
    type: "philosophy",
    feeds: ["https://anchor.fm/s/fad927cc/podcast/rss", "https://anchor.fm/s/f9c2398c/podcast/rss"],
  },
  {
    artist: "شبكة أجيال",
    name_ar: "شبكة أجيال",
    slug: "ajyal",
    title_ar: "",
    specialty_ar: "تقنية وصحة",
    country: "فلسطين",
    type: "technology",
    feeds: ["https://arn.ps/podcast/294", "https://arn.ps/podcast/265", "https://arn.ps/podcast/308", "https://arn.ps/podcast/266", "https://arn.ps/podcast/224", "https://arn.ps/podcast/305", "https://arn.ps/podcast/296", "https://arn.ps/podcast-xml/320", "https://arn.ps/podcast/248", "https://arn.ps/podcast/282", "https://arn.ps/podcast/242", "https://arn.ps/podcast/246", "https://arn.ps/podcast/312", "https://arn.ps/podcast/302", "https://arn.ps/podcast/286", "https://arn.ps/podcast/252", "https://arn.ps/podcast/275", "https://arn.ps/podcast/315", "https://arn.ps/podcast/230", "https://arn.ps/podcast/241", "https://arn.ps/podcast/316", "https://arn.ps/podcast/303", "https://arn.ps/podcast/243", "https://arn.ps/podcast/227", "https://arn.ps/podcast-xml/318", "https://arn.ps/podcast/310", "https://arn.ps/podcast/291", "https://arn.ps/podcast/313", "https://arn.ps/podcast/231", "https://arn.ps/podcast/250", "https://arn.ps/podcast/238", "https://arn.ps/podcast/247", "https://arn.ps/podcast/281", "https://arn.ps/podcast/269", "https://arn.ps/podcast/288", "https://arn.ps/podcast/314", "https://arn.ps/podcast/301", "https://arn.ps/podcast/280", "https://arn.ps/podcast/233", "https://arn.ps/podcast-xml/319", "https://arn.ps/podcast/239", "https://arn.ps/podcast/228", "https://arn.ps/podcast/234", "https://arn.ps/podcast/232", "https://arn.ps/podcast/235", "https://arn.ps/podcast/244", "https://arn.ps/podcast/249", "https://arn.ps/podcast/236", "https://arn.ps/podcast/222", "https://arn.ps/podcast/225", "https://arn.ps/podcast/237", "https://arn.ps/podcast/226", "https://arn.ps/podcast/229", "https://arn.ps/podcast/240", "https://arn.ps/podcast/245", "https://arn.ps/podcast/276", "https://arn.ps/podcast/259", "https://arn.ps/podcast/254", "https://arn.ps/podcast/311", "https://arn.ps/podcast-xml/321", "https://arn.ps/podcast/253", "https://arn.ps/podcast/256", "https://arn.ps/podcast/279", "https://arn.ps/podcast-xml/323", "https://arn.ps/podcast/289", "https://arn.ps/podcast-xml/330", "https://arn.ps/podcast/278", "https://arn.ps/podcast/293", "https://arn.ps/podcast-xml/325", "https://arn.ps/podcast/287", "https://arn.ps/podcast/274", "https://arn.ps/podcast/257", "https://arn.ps/podcast/295", "https://arn.ps/podcast/306", "https://arn.ps/podcast/307", "https://arn.ps/podcast/297", "https://arn.ps/podcast/284", "https://arn.ps/podcast-xml/324", "https://arn.ps/podcast/251", "https://arn.ps/podcast/264", "https://arn.ps/podcast/260", "https://arn.ps/podcast/298", "https://arn.ps/podcast/261", "https://arn.ps/podcast/283", "https://arn.ps/podcast/299", "https://arn.ps/podcast/263", "https://arn.ps/podcast/272", "https://arn.ps/podcast/304", "https://arn.ps/podcast/292", "https://arn.ps/podcast/255", "https://arn.ps/podcast/277", "https://arn.ps/podcast/290", "https://arn.ps/podcast/273", "https://arn.ps/podcast/270", "https://arn.ps/podcast/262", "https://arn.ps/podcast/309", "https://arn.ps/podcast/285", "https://arn.ps/podcast-xml/322"],
  },
  {
    artist: "Augustus Media",
    name_ar: "أغسطس ميديا",
    slug: "augustus",
    title_ar: "",
    specialty_ar: "علاقات ومجتمع",
    country: "لبنان",
    type: "relationships",
    feeds: ["https://media.podeo.co/rss/MTI4", "https://media.podeo.co/rss/NTI1MA", "https://media.podeo.co/rss/NDczNA", "https://media.podeo.co/rss/ODc2", "https://media.podeo.co/rss/MTI3", "https://media.podeo.co/rss/MjMwNjk", "https://media.podeo.co/rss/Mjc4NTQ", "https://media.podeo.co/rss/NTMzNA", "https://media.podeo.co/rss/MTI0", "https://media.podeo.co/rss/MTAwNjU", "https://media.podeo.co/rss/MjMwNTI", "https://media.podeo.co/rss/OTU1Ng", "https://media.podeo.co/rss/MjMwNTQ", "https://media.podeo.co/rss/MTI3MjQ", "https://media.podeo.co/rss/MjMwNDg", "https://media.podeo.co/rss/MTU2MjY", "https://media.podeo.co/rss/Mjc4NTM", "https://media.podeo.co/rss/MTAxMTM", "https://media.podeo.co/rss/ODc1", "https://media.podeo.co/rss/ODIwOQ", "https://media.podeo.co/rss/MjMwNTM", "https://media.podeo.co/rss/MTAwNzA", "https://media.podeo.co/rss/Njk4OQ", "https://media.podeo.co/rss/MjMwODI", "https://media.podeo.co/rss/MTAwNjg", "https://media.podeo.co/rss/MjMyNzA", "https://media.podeo.co/rss/MzIxNQ", "https://media.podeo.co/rss/MjQ4MDM", "https://media.podeo.co/rss/MjUxNDU", "https://media.podeo.co/rss/MjQ4MzY", "https://media.podeo.co/rss/MjQ4MjU", "https://media.podeo.co/rss/MTAwNjk", "https://media.podeo.co/rss/MjUxNTk", "https://media.podeo.co/rss/MjUxNDY", "https://media.podeo.co/rss/MjQ4MjA", "https://media.podeo.co/rss/MjMwNzA", "https://media.podeo.co/rss/MjUxNDg", "https://media.podeo.co/rss/MjUxNTQ", "https://media.podeo.co/rss/MjQ4MjE", "https://media.podeo.co/rss/MjUxNTc", "https://media.podeo.co/rss/MjQ5NjE", "https://media.podeo.co/rss/ODc0", "https://media.podeo.co/rss/MjUxNDM", "https://media.podeo.co/rss/MTAwNzI", "https://media.podeo.co/rss/Mzcx", "https://media.podeo.co/rss/MjQ5NDI", "https://media.podeo.co/rss/MjUxNDc", "https://media.podeo.co/rss/MjUwODQ", "https://media.podeo.co/rss/MjUxNTI", "https://media.podeo.co/rss/MjUxNDE", "https://media.podeo.co/rss/MjQ2MDI", "https://media.podeo.co/rss/MjUxMTA", "https://media.podeo.co/rss/MjUxNDA", "https://media.podeo.co/rss/MjUzNTI", "https://media.podeo.co/rss/MjMwNzE", "https://media.podeo.co/rss/MjM0Mzg", "https://media.podeo.co/rss/MjQ4MjI", "https://media.podeo.co/rss/NDkwNQ", "https://media.podeo.co/rss/MTAwNzE", "https://media.podeo.co/rss/MjQ5NDQ", "https://media.podeo.co/rss/MTAwNjc", "https://media.podeo.co/rss/MTAwNjY", "https://media.podeo.co/rss/Njg5MA", "https://media.podeo.co/rss/MjUxNTg", "https://media.podeo.co/rss/Mjk4MDI", "https://media.podeo.co/rss/MjMwNTE", "https://media.podeo.co/rss/MjMwNzU", "https://media.podeo.co/rss/MjMwNzQ", "https://media.podeo.co/rss/MjMwNzY", "https://media.podeo.co/rss/MjMwNjY", "https://media.podeo.co/rss/MjU1NzI", "https://media.podeo.co/rss/Mjk4MDA", "https://media.podeo.co/rss/MjMwNDk"],
  },
  {
    artist: "مكس إ ف إم",
    name_ar: "مكس إف إم",
    slug: "mix-fm",
    title_ar: "",
    specialty_ar: "صحة وغذاء",
    country: "الأردن",
    type: "health",
    feeds: ["https://feeds.acast.com/public/shows/64805ffdf6a49300111daf02", "https://feeds.acast.com/public/shows/6476edbdc35e3400117734a9", "https://www.mixfm-sa.com/podcast/feed/aal-altryk.xml", "https://feeds.acast.com/public/shows/64808b81d9a8290011613088", "https://www.mixfm-sa.com/podcast/feed/mks-karz.xml", "https://www.mixfm-sa.com/podcast/feed/ana-akdr-can-i.xml", "https://www.mixfm-sa.com/podcast/feed/nojoumalleilshow.xml", "https://www.mixfm-sa.com/podcast/feed/mks-tryks.xml", "https://www.mixfm-sa.com/podcast/feed/yazalailshow.xml", "https://www.mixfm-sa.com/podcast/feed/mn-klb-alhdth.xml", "https://www.mixfm-sa.com/podcast/feed/nostaljya.xml", "https://www.mixfm-sa.com/podcast/feed/rymot.xml", "https://www.mixfm-sa.com/podcast/feed/balmklob.xml", "https://feeds.acast.com/public/shows/648060d99833cf0011a23381", "https://feeds.acast.com/public/shows/648060b21899590011748b03", "https://www.mixfm-sa.com/podcast/feed/foanys.xml", "https://www.mixfm-sa.com/podcast/feed/sh-sh.xml", "https://feeds.acast.com/public/shows/6480601704c70d0011eb84d9", "https://feeds.acast.com/public/shows/64805d9704c70d0011eb2ce0", "https://feeds.acast.com/public/shows/64805d779833cf0011a1b962", "https://www.mixfm-sa.com/podcast/feed/hay-oay.xml", "https://feeds.acast.com/public/shows/6480951a1afaa20011b44541", "https://feeds.acast.com/public/shows/648060878a971b001107aa4f", "https://www.mixfm-sa.com/podcast/feed/top-10.xml"],
  },
  {
    artist: "Ghaith Atari",
    name_ar: "غيث عتري",
    slug: "ghaith-atari",
    title_ar: "",
    specialty_ar: "تاريخ وحضارة",
    country: "الأردن",
    type: "history",
    feeds: ["https://rss.buzzsprout.com/2567537.rss"],
  },
  {
    artist: "Yousef ِAbdullah",
    name_ar: "يوسف عبدالله",
    slug: "yousef-abdullah",
    title_ar: "",
    specialty_ar: "تقنية",
    country: "السعودية",
    type: "technology",
    feeds: ["https://anchor.fm/s/8b8840c4/podcast/rss"],
  },
  {
    artist: "إبراهيم الفقي",
    name_ar: "إبراهيم الفقي",
    slug: "ibrahim-alfaqi",
    title_ar: "",
    specialty_ar: "التنمية الذاتية",
    country: "مصر",
    type: "motivational",
    feeds: ["https://www.spreaker.com/show/5807591/episodes/feed", "https://media.podeo.co/rss/MjYyNzg", "https://www.spreaker.com/show/6288799/episodes/feed"],
  },
  {
    artist: "Annaja7 Radio | راديو النجاح",
    name_ar: "راديو النجاح",
    slug: "annaja7",
    title_ar: "",
    specialty_ar: "التنمية الذاتية",
    country: "مصر",
    type: "motivational",
    feeds: ["https://feeds.soundcloud.com/users/soundcloud:users:73692657/sounds.rss", "https://media.podeo.co/rss/OTY4OQ", "https://media.podeo.co/rss/OTY5Mw", "https://media.podeo.co/rss/OTY4Nw", "https://media.podeo.co/rss/OTk4Ng", "https://media.podeo.co/rss/OTc1Mg", "https://media.podeo.co/rss/OTY4Ng", "https://media.podeo.co/rss/OTc0Nw", "https://media.podeo.co/rss/OTk5Mg", "https://media.podeo.co/rss/OTk4NA", "https://media.podeo.co/rss/OTc1MQ", "https://media.podeo.co/rss/OTk4OA", "https://media.podeo.co/rss/OTY4NA", "https://media.podeo.co/rss/OTk4Mg", "https://media.podeo.co/rss/OTc0Ng", "https://media.podeo.co/rss/OTc1NA", "https://media.podeo.co/rss/MTE0NzA", "https://media.podeo.co/rss/OTc0OA", "https://media.podeo.co/rss/OTk4MA", "https://media.podeo.co/rss/OTc1Mw", "https://media.podeo.co/rss/OTY5MA", "https://media.podeo.co/rss/OTc1OQ", "https://anchor.fm/s/44b81700/podcast/rss", "https://media.podeo.co/rss/OTY4OA", "https://media.podeo.co/rss/OTc0OQ", "https://media.podeo.co/rss/OTc1NQ", "https://media.podeo.co/rss/OTY4NQ", "https://media.podeo.co/rss/OTk4MQ", "https://media.podeo.co/rss/OTk4NQ", "https://media.podeo.co/rss/OTc1OA", "https://media.podeo.co/rss/OTc1MA", "https://media.podeo.co/rss/OTc1Ng", "https://media.podeo.co/rss/OTY4Mw", "https://media.podeo.co/rss/OTk5MA", "https://media.podeo.co/rss/OTk3OQ", "https://media.podeo.co/rss/OTk5MQ", "https://media.podeo.co/rss/OTk4OQ", "https://media.podeo.co/rss/OTk4Mw"],
  },
  {
    artist: "Osama Gad",
    name_ar: "أسامة جاد",
    slug: "osama-gad",
    title_ar: "",
    specialty_ar: "التنمية الذاتية",
    country: "مصر",
    type: "motivational",
    feeds: ["https://feeds.simplecast.com/YzVDtbov", "https://feeds.simplecast.com/lM_tJJNQ", "https://anchor.fm/s/d20ee7c8/podcast/rss"],
  },
  {
    artist: "المدربة رغد البهيّة",
    name_ar: "رغد البهية",
    slug: "raghd-albahiyya",
    title_ar: "",
    specialty_ar: "التنمية الذاتية",
    country: "السعودية",
    type: "motivational",
    feeds: ["https://anchor.fm/s/ddb4b404/podcast/rss"],
  },
  {
    artist: "مبادرة هيمنة النجاح",
    name_ar: "هيمنة النجاح",
    slug: "hegazy",
    title_ar: "",
    specialty_ar: "التنمية الذاتية",
    country: "السعودية",
    type: "motivational",
    feeds: ["https://anchor.fm/s/106dc1d40/podcast/rss"],
  },
  {
    artist: "Khaled AbdElmoneim",
    name_ar: "خالد عبد المنعم",
    slug: "rihlat-ryada",
    title_ar: "",
    specialty_ar: "ريادة أعمال",
    country: "مصر",
    type: "professional",
    feeds: ["https://anchor.fm/s/ec9ef0c4/podcast/rss"],
  },
  {
    artist: "Yousef Nour",
    name_ar: "يوسف نور",
    slug: "yousef-nour",
    title_ar: "",
    specialty_ar: "التنمية الذاتية",
    country: "مصر",
    type: "motivational",
    feeds: ["https://media.rss.com/pod99/feed.xml"],
  },
  {
    artist: "دروب النجاح",
    name_ar: "دروب النجاح",
    slug: "doroob-alnajah",
    title_ar: "",
    specialty_ar: "التنمية الذاتية",
    country: "السعودية",
    type: "motivational",
    feeds: ["https://anchor.fm/s/a5200bc/podcast/rss"],
  },
  {
    artist: "Abdelmoula",
    name_ar: "عبد المولى",
    slug: "amal-alnajah",
    title_ar: "",
    specialty_ar: "التنمية الذاتية",
    country: "المغرب",
    type: "motivational",
    feeds: ["https://anchor.fm/s/e7f2db8/podcast/rss", "https://anchor.fm/s/40513cc8/podcast/rss"],
  },
  {
    artist: "Samir Haouate - Business Tube",
    name_ar: "سمير حواط",
    slug: "samir-haouate",
    title_ar: "",
    specialty_ar: "ريادة أعمال",
    country: "لبنان",
    type: "professional",
    feeds: ["https://anchor.fm/s/3543f258/podcast/rss"],
  },
  {
    artist: "Mohammad Alawamleh",
    name_ar: "محمد العواملة",
    slug: "mohammad-alawamleh",
    title_ar: "",
    specialty_ar: "إدارة وقت",
    country: "الأردن",
    type: "motivational",
    feeds: ["https://anchor.fm/s/f7c9b09c/podcast/rss"],
  },
  {
    artist: "Podcast@wahe4| بودكاست وعي",
    name_ar: "بودكاست وعي",
    slug: "podcast-wahe4",
    title_ar: "",
    specialty_ar: "التنمية الذاتية",
    country: "السعودية",
    type: "psychology",
    feeds: ["https://anchor.fm/s/108148058/podcast/rss"],
  },
  {
    artist: "NAWAF ABDULAZIZ",
    name_ar: "نواف عبدالعزيز",
    slug: "nawaf-alabdulaziz",
    title_ar: "",
    specialty_ar: "التنمية الذاتية",
    country: "السعودية",
    type: "motivational",
    feeds: ["https://anchor.fm/s/bac47aec/podcast/rss"],
  },

  /* --- Arabic hosts requested in the big list (verified public feeds) --- */
  {
    artist: "د. مصطفى محمود",
    name_ar: "مصطفى محمود",
    slug: "mostafa-mahmoud",
    title_ar: "الدكتور",
    specialty_ar: "فكر وفلسفة",
    country: "مصر",
    type: "philosophy",
    feeds: [
      "https://feeds.simplecast.com/nPUGwLSe",
      "https://www.spreaker.com/show/5784967/episodes/feed",
    ],
  },
  {
    artist: "ياسر الحزيمي",
    name_ar: "ياسر الحزيمي",
    slug: "yasser-hizimi",
    title_ar: "",
    specialty_ar: "التنمية الذاتية",
    country: "السعودية",
    type: "motivational",
    feeds: [
      "https://media.podeo.co/rss/MjI3NTg",
      "https://media.podeo.co/rss/MjI3NTk",
      "https://media.podeo.co/rss/MjI3NTM",
      "https://media.podeo.co/rss/MjI3NTI",
      "https://rss.buzzsprout.com/2567578.rss",
    ],
  },
  {
    artist: "د. حازم شومان",
    name_ar: "حازم شومان",
    slug: "hazem-shouman",
    title_ar: "الدكتور",
    specialty_ar: "علوم إسلامية",
    country: "مصر",
    type: "religious",
    feeds: ["https://feeds.soundcloud.com/users/soundcloud:users:231462027/sounds.rss"],
  },
  {
    artist: "الشيخ محمد الغليظ",
    name_ar: "محمد الغليظ",
    slug: "mohammed-al-ghalith",
    title_ar: "الشيخ",
    specialty_ar: "علوم إسلامية",
    country: "مصر",
    type: "religious",
    feeds: [
      "https://raw.githubusercontent.com/dev-fos/islampodcast/main/%D9%85%D8%AD%D9%85%D8%AF-%D8%A7%D9%84%D8%BA%D9%84%D9%8A%D8%B8/%D9%81%D8%B6%D9%81%D8%B6%D8%A9-%D8%A7%D9%84%D8%A3%D8%AD%D8%AF.xml",
      "https://raw.githubusercontent.com/dev-fos/islampodcast/main/%D9%85%D8%AD%D9%85%D8%AF-%D8%A7%D9%84%D8%BA%D9%84%D9%8A%D8%B8/%D8%B7%D8%B1%D9%8A%D9%82-%D8%A7%D9%84%D8%B3%D8%B9%D8%A7%D8%AF%D8%A9-%D9%85%D9%86-%D8%B3%D9%88%D8%B1%D8%A9-%D8%A7%D9%84%D9%81%D8%A7%D8%AA%D8%AD%D8%A9.xml",
    ],
  },
  {
    artist: "إيهاب ماجد",
    name_ar: "إيهاب ماجد",
    slug: "ehab-magid",
    title_ar: "",
    specialty_ar: "الصحة النفسية",
    country: "مصر",
    type: "psychology",
    feeds: ["https://anchor.fm/s/10c31d960/podcast/rss"],
  },
  {
    artist: "أحمد الشقيري",
    name_ar: "أحمد الشقيري",
    slug: "ahmed-al-shugairi",
    title_ar: "",
    specialty_ar: "خواطر وفكر",
    country: "السعودية",
    type: "cultural",
    feeds: [
      "http://www.fawaed.tv/series/14/rss",
      "http://www.fawaed.tv/series/16/rss",
      "http://www.fawaed.tv/series/17/rss",
    ],
  },
  {
    artist: "عبدالله العلاوي",
    name_ar: "عبدالله العلاوي",
    slug: "abdullah-al-alawi",
    title_ar: "",
    specialty_ar: "قصص الحياة والصحة",
    country: "السعودية",
    type: "cultural",
    feeds: ["https://media.podeo.co/rss/MjIzNjU"],
  },
  {
    artist: "الشيخ أحمد العزب",
    name_ar: "أحمد العزب",
    slug: "sheikh-ahmed-al-azab",
    title_ar: "الشيخ",
    specialty_ar: "دروس ومحاضرات",
    country: "مصر",
    type: "religious",
    feeds: ["https://feeds.soundcloud.com/users/soundcloud:users:696034914/sounds.rss"],
    archiveOrg: ["20240306_20240306_1943"],
  },
  {
    artist: "علي محمد علي",
    name_ar: "علي محمد علي",
    slug: "ali-mohammed-ali",
    title_ar: "",
    specialty_ar: "التنمية الذاتية",
    country: "مصر",
    type: "motivational",
    feeds: ["https://rss.buzzsprout.com/1983197.rss"],
  },
  {
    artist: "ناصر العقيل",
    name_ar: "ناصر العقيل",
    slug: "nasser-al-oqaili",
    title_ar: "",
    specialty_ar: "كتب وتنمية بشرية",
    country: "السعودية",
    type: "cultural",
    feeds: ["https://feeds.acast.com/public/shows/66b69b4dbda5e2df147feba2"],
  },

  /* --- Celebrity hosts added across entertainment, sport, health and faith --- */
  {
    artist: "Hadeel Marei and Maha Jaafar",
    name_ar: "هديل مرعي ومها جعفر",
    slug: "hadeel-maha",
    title_ar: "",
    specialty_ar: "كوميديا وفن",
    country: "الأردن",
    type: "comedy",
    typeOverride: "comedy",
    feeds: ["https://feeds.simplecast.com/ZeW12QEI"],
  },
  {
    artist: "Al Mashhad Podcasts",
    name_ar: "محمد قيس | المشهد",
    slug: "mohammed-qais",
    title_ar: "الإعلامي",
    specialty_ar: "حوارات الفن والمشاهير",
    country: "لبنان",
    type: "cultural",
    typeOverride: "cultural",
    feeds: ["https://media.podeo.co/rss/MTkxODU"],
  },
  {
    artist: "Bassel Alzaro - Karim Rihan",
    name_ar: "باسل الزارو وكريم ريحان",
    slug: "el-podcasters",
    title_ar: "",
    specialty_ar: "كوميديا وريادة",
    country: "الأردن",
    type: "comedy",
    typeOverride: "comedy",
    feeds: ["https://feeds.simplecast.com/jHDFzRlp"],
  },
  {
    artist: "Abdulrahman Magdy - عبدالرحمن مجدي",
    name_ar: "عبدالرحمن مجدي",
    slug: "abdulrahman-magdy",
    title_ar: "",
    specialty_ar: "إعلام رياضي",
    country: "مصر",
    type: "sports",
    typeOverride: "sports",
    feeds: ["https://media.rss.com/goalcast/feed.xml"],
  },
  {
    artist: "شوط | shoatt",
    name_ar: "شوط",
    slug: "shoot",
    title_ar: "",
    specialty_ar: "تحليل كروي",
    country: "مصر",
    type: "sports",
    typeOverride: "sports",
    feeds: ["https://feeds.simplecast.com/fOS1zm4Q"],
  },
  {
    artist: "نوف عزيز",
    name_ar: "نوف عزيز",
    slug: "nouf-aziz",
    title_ar: "",
    specialty_ar: "سفر وطرح حياتي",
    country: "السعودية",
    type: "cultural",
    typeOverride: "cultural",
    feeds: ["https://feeds.simplecast.com/6krWL__b"],
  },
  {
    artist: "ابو طلال الحمراني",
    name_ar: "أبو طلال الحمراني",
    slug: "abu-talal-alhamrani",
    title_ar: "الشيخ",
    specialty_ar: "قصص ووقائع",
    country: "السعودية",
    type: "history",
    typeOverride: "history",
    feeds: ["https://media.podeo.co/rss/MTU2NzI"],
  },
  {
    artist: "Mohamed Abdelaty",
    name_ar: "محمد عبدالعاطي",
    slug: "mohamed-abdelaty",
    title_ar: "",
    specialty_ar: "كوميديا وحوارات",
    country: "مصر",
    type: "comedy",
    typeOverride: "comedy",
    feeds: ["https://feeds.acast.com/public/shows/65b911017c4d650017dc0768"],
  },
  {
    artist: "Ziad Aladdin زياد علاء الدين",
    name_ar: "زياد علاء الدين",
    slug: "ziad-aladdin",
    title_ar: "",
    specialty_ar: "إعلام وحوارات",
    country: "مصر",
    type: "cultural",
    typeOverride: "cultural",
    feeds: ["https://media.podeo.co/rss/MTA1ODE"],
  },
  {
    artist: "Maha Hasabo",
    name_ar: "مها حسبو",
    slug: "maha-hasabo",
    title_ar: "",
    specialty_ar: "علاقات وحياة",
    country: "مصر",
    type: "relationships",
    typeOverride: "relationships",
    feeds: ["https://media.podeo.co/rss/MjI3MTI"],
  },
  {
    artist: "Maher Al-Muaiqly",
    name_ar: "ماهر المعيقلي",
    slug: "maher-al-muaiqly",
    title_ar: "الشيخ",
    specialty_ar: "تلاوة القرآن",
    country: "السعودية",
    type: "religious",
    typeOverride: "religious",
    feeds: ["https://www.spreaker.com/show/6316699/episodes/feed"],
  },
  {
    artist: "Saud Al-Shuraim",
    name_ar: "سعود الشريم",
    slug: "saud-al-shuraim",
    title_ar: "الشيخ",
    specialty_ar: "تلاوة القرآن",
    country: "السعودية",
    type: "religious",
    typeOverride: "religious",
    feeds: ["https://storage.googleapis.com/cvsender/rss/Shuraim.rss"],
  },
  {
    artist: "د. طارق ثروت",
    name_ar: "طارق ثروت",
    slug: "tarek-tharwat",
    title_ar: "الدكتور",
    specialty_ar: "صحة الفم والأسنان",
    country: "مصر",
    type: "health",
    typeOverride: "health",
    feeds: ["https://media.podeo.co/rss/NDM2NQ"],
  },

  /* --- Requested podcasts + specific real episodes by topic (append only) --- */
  {
    artist: "بودكاست وسام",
    name_ar: "بودكاست وسام",
    slug: "podcast-wesam",
    title_ar: "",
    specialty_ar: "حوارات وتطوير ذات",
    country: "",
    type: "cultural",
    typeOverride: "cultural",
    feedsOnly: true,
    feeds: ["https://feeds.soundcloud.com/users/soundcloud:users:1067236822/sounds.rss"],
  },
  {
    artist: "ثيرابيا | Therapia",
    name_ar: "ثيرابيا",
    slug: "therapia",
    title_ar: "",
    specialty_ar: "سلوك وصحة نفسية",
    country: "",
    type: "psychology",
    typeOverride: "psychology",
    feedsOnly: true,
    episodeMatch: "لغة الجسد|جسدك",
    feeds: ["https://anchor.fm/s/1035ffb50/podcast/rss"],
  },
  {
    artist: "عبدالرزاق الحاج سعيد",
    name_ar: "إدمان إيجابي",
    slug: "positive-addiction",
    title_ar: "",
    specialty_ar: "تنمية ذات وعقل باطن",
    country: "",
    type: "psychology",
    typeOverride: "psychology",
    feedsOnly: true,
    episodeMatch: "العقل الباطن",
    feeds: ["https://media.rss.com/positiveaddiction/feed.xml"],
  },
  {
    artist: "EMPWR House | سارة سيف",
    name_ar: "سارة سيف | فن الإبداع والتواصل",
    slug: "empwr-communication",
    title_ar: "",
    specialty_ar: "تواصل وإبداع",
    country: "",
    type: "professional",
    typeOverride: "professional",
    feedsOnly: true,
    episodeMatch: "التواصل|القاء|الإلقاء|سوشيال ميديا|علامتك التجارية",
    feeds: ["https://media.podeo.co/rss/NDQxOQ"],
  },
  {
    artist: "Ruqaya Albalooshi",
    name_ar: "رُقى البلوشي | فن العلاقات",
    slug: "fan-al-alaqat",
    title_ar: "",
    specialty_ar: "علاقات إنسانية",
    country: "",
    type: "relationships",
    typeOverride: "relationships",
    feedsOnly: true,
    feeds: ["https://media.podeo.co/rss/ODI0Mw"],
  },
  {
    artist: "FranklinCovey Middle East",
    name_ar: "فرانكلين كوفي الشرق الأوسط | عن القيادة",
    slug: "franklincovey-leadership",
    title_ar: "",
    specialty_ar: "قيادة وفرق عمل",
    country: "",
    type: "leadership",
    typeOverride: "leadership",
    feedsOnly: true,
    feeds: ["https://feeds.redcircle.com/9d27f48a-fbd0-45d8-9015-8cdb30f00f96"],
  },
  {
    artist: "Ertigal Podcast",
    name_ar: "ارتجال بودكاست",
    slug: "irtgal-podcast",
    title_ar: "",
    specialty_ar: "حوارات ارتجالية",
    country: "",
    type: "cultural",
    typeOverride: "cultural",
    feedsOnly: true,
    feeds: ["https://feeds.soundcloud.com/users/soundcloud:users:399992814/sounds.rss"],
  },

  /* --- Cybersecurity in Arabic: real public feeds, Arabic-speaking hosts --- */
  {
    artist: "كلام سايبر",
    name_ar: "كلام سايبر | سجى الجلعود ونوره المبيريك",
    slug: "kalam-cyber",
    title_ar: "",
    specialty_ar: "الأمن السيبراني وروّاد المجال",
    country: "السعودية",
    type: "technology",
    typeOverride: "technology",
    feedsOnly: true,
    feeds: ["https://feeds.buzzsprout.com/2369623.rss"],
  },
  {
    artist: "Osama Kamal",
    name_ar: "سكيوريتي بالعربي | أسامة كمال",
    slug: "security-in-arabic",
    title_ar: "",
    specialty_ar: "أمن المعلومات وتحليلات الأمن السيبراني",
    country: "",
    type: "technology",
    typeOverride: "technology",
    feedsOnly: true,
    feeds: ["https://anchor.fm/s/d38680e8/podcast/rss"],
  },
  {
    artist: "Sakhr Podcast",
    name_ar: "بودكاست صخر",
    slug: "sakhr-podcast",
    title_ar: "",
    specialty_ar: "الأمن السيبراني والذكاء الاصطناعي",
    country: "",
    type: "technology",
    typeOverride: "technology",
    feedsOnly: true,
    feeds: ["https://anchor.fm/s/106d4d210/podcast/rss"],
  },
];

const CATEGORY_BY_TYPE = {
  religious: 'روحاني / ديني',
  scientific: 'العلوم',
  cultural: 'ثقافة وأدب',
  motivational: 'المسيرة المهنية',
  professional: 'المسيرة المهنية',
  technology: 'التقنية',
  psychology: 'الصحة النفسية',
  health: 'الصحة واللياقة',
  relationships: 'العلاقات والأسرة',
  leadership: 'القيادة',
  kids: 'ثقافة وأدب',
  sports: 'الصحة واللياقة',
  comedy: 'ثقافة وأدب',
  history: 'العلوم',
  philosophy: 'العلوم',
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
      if (res.status === 403 || res.status === 429 || res.status >= 500) {
        lastErr = new Error(`HTTP ${res.status}`);
        await sleep(1500 * (i + 1));
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
    { type: 'technology', words: ['تقنية', 'تقني', 'تكنولوجيا', 'برمجة', 'مبرمج', 'كود', 'ذكاء اصطناعي', 'تطبيقات', 'إنترنت', 'انترنت', 'حاسوب', 'كمبيوتر', 'سيبراني', 'بيانات'] },
    { type: 'psychology', words: ['نفسي', 'نفسية', 'صحة نفسية', 'اكتئاب', 'قلق', 'توتر', 'مشاعر', 'علاج نفسي', 'صدمة', 'ذات'] },
    { type: 'relationships', words: ['علاقات', 'زواج', 'حب', 'أسر', 'اسرة', 'أسري', 'تربية', 'أطفال', 'اطفال', 'والدين', 'أمومة', 'امومة', 'أبوة', 'ابوة', 'طلاق', 'خطوبة'] },
    { type: 'health', words: ['صحة', 'لياقة', 'رياضة', 'تغذية', 'غذاء', 'دايت', 'رجيم', 'جيم', 'عضلات', 'نوم', 'طب', 'مرض', 'سكري', 'كوليسترول'] },
    { type: 'sports', words: ['كورة', 'كرة', 'مباراة', 'دوري', 'ملاعب', 'رياضي', 'مصارعة', 'mma', 'أولمبياد', 'اولمبياد'] },
    { type: 'kids', words: ['أطفال', 'اطفال', 'حكايات', 'قصص للأطفال', 'حواديت', 'صغار'] },
    { type: 'comedy', words: ['كوميدي', 'كوميديا', 'ضحك', 'نكتة', 'ستاند أب'] },
    { type: 'history', words: ['تاريخ', 'تاريخي', 'حضارة', 'حضارات', 'قدماء', 'مصر القديمة', 'عصور'] },
    { type: 'philosophy', words: ['فلسفة', 'فلسفي', 'فكر', 'منطق', 'وجودية', 'أخلاق', 'اخلاق'] },
    { type: 'scientific', words: ['علم', 'علوم', 'فيزياء', 'فضاء', 'كون', 'أحياء', 'احياء', 'كيمياء', 'بحث'] },
    { type: 'motivational', words: ['تحفيز', 'طاقة', 'إلهام', 'الهام', 'عادة', 'عادات', 'تطوير ذات'] },
    { type: 'cultural', words: ['ثقافة', 'أدب', 'ادب', 'قصص', 'حكاية', 'مجتمع', 'سينما', 'فن', 'موسيقى', 'مسرح'] },
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

async function itunesArtistCatalog(artistId, country = 'eg') {
  const url = new URL('https://itunes.apple.com/lookup');
  url.searchParams.set('id', String(artistId));
  url.searchParams.set('entity', 'podcast');
  url.searchParams.set('limit', '200');
  url.searchParams.set('country', country);
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

function dedupeShows(shows) {
  // Some publishers expose the same show under several storefront ids/feeds.
  const byFeed = new Map();
  for (const show of shows) {
    if (!show.feedUrl) continue;
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

async function findShows(host) {
  const artistIds = new Set([host.artistId].filter(Boolean).map(String));
  const matched = [];

  // Apple's search endpoint is aggressively rate-limited. Hosts whose Apple
  // artist id is known go straight to lookup (which returns the FULL catalog).
  // feedsOnly hosts deliberately skip Apple so only the listed feeds are used.
  if (!host.feedsOnly) {
    if (artistIds.size === 0) {
      const aliases = [...new Set([host.artist, ...(host.aliases || [])].filter(Boolean))];
      const wanted = new Set(aliases.map(normalizeName));
      for (const term of aliases) {
        for (const country of ['eg', 'sa', 'ae', 'us']) {
          const results = await itunesSearch(term, country);
          await sleep(350);
          for (const r of results) {
            if (!r.feedUrl) continue;
            if (!wanted.has(normalizeName(r.artistName))) continue;
            matched.push(r);
            if (r.artistId) artistIds.add(String(r.artistId));
          }
        }
      }
    }

    for (const artistId of artistIds) {
      for (const country of ['eg', 'sa', 'ae']) {
        const catalog = await itunesArtistCatalog(artistId, country);
        await sleep(300);
        for (const r of catalog) {
          if (!r.feedUrl) continue;
          matched.push(r);
        }
      }
    }
  }

  // Explicit feeds always win (small publishers have no Apple artist page).
  // Give each feed a distinct collectionName so dedupeShows keeps them all —
  // the real title is read from the feed's own <title> during parsing.
  for (const [i, feedUrl] of (host.feeds || []).entries()) {
    matched.push({
      feedUrl,
      collectionName: `${host.name_ar} ${i + 1}`,
      artistName: host.artist,
      artworkUrl600: '',
    });
  }

  // Public Internet Archive collections of the host's own recordings are
  // exposed as pseudo-feeds; archiveFeed() builds episodes from the metadata.
  for (const [i, id] of (host.archiveOrg || []).entries()) {
    matched.push({
      feedUrl: `archive:${id}`,
      collectionName: `${host.name_ar} أرشيف ${i + 1}`,
      artistName: host.artist,
      artworkUrl600: '',
    });
  }

  return dedupeShows(matched);
}

/* ------------------------------------------------------------------ */
/* RSS parsing                                                         */
/* ------------------------------------------------------------------ */

function audioUrlFromItem(item) {
  // Some feeds (e.g. fawaed.tv) put an image/jpeg enclosure first and keep
  // the mp3 in a custom tag, so pick an actual audio enclosure when present.
  const enclosures = [...item.matchAll(/<enclosure\b[^>]*>/gi)].map((m) => m[0]);
  const audio = enclosures.find((tag) => {
    const type = /\btype\s*=\s*"([^"]*)"/i.exec(tag)?.[1] || '';
    const url = /\burl\s*=\s*"([^"]*)"/i.exec(tag)?.[1] || '';
    return /^audio\//i.test(type) || /\.(mp3|m4a|aac|ogg|wav)(\?|$)/i.test(url);
  });

  let url = audio ? /\burl\s*=\s*"([^"]*)"/i.exec(audio)[1] : '';
  if (!url) {
    for (const tag of ['fawaed:listen', 'fawaed:mp3']) {
      const m = item.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
      if (m) {
        url = m[1].trim();
        break;
      }
    }
  }
  if (!url) url = attr(item, 'enclosure', 'url');

  url = url.replace(/&amp;/g, '&');
  // archive.org serves the same files over HTTPS; upgrade so browsers don't
  // block them as mixed content on the HTTPS app.
  if (/^http:\/\/(?:www\.)?archive\.org\//i.test(url)) url = url.replace(/^http:\/\//i, 'https://');
  return url;
}

function parseFeed(xml, show) {
  const channelMatch = xml.match(/<channel[^>]*>([\s\S]*?)<\/channel>/i);
  const channel = channelMatch ? channelMatch[1] : xml;

  const items = [...channel.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].map((m) => m[1]);

  const episodes = [];
  const seenAudio = new Set();

  for (const item of items) {
    const audioUrl = audioUrlFromItem(item);
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
/* Internet Archive collections (real mp3s, built from metadata API)    */
/* ------------------------------------------------------------------ */

async function archiveFeed(id, show) {
  const res = await fetchWithRetry(`https://archive.org/metadata/${encodeURIComponent(id)}`, {
    timeout: 45000,
  });
  if (!res.ok) return { episodes: [], image: '', feedTitle: '', feedDescription: '', genre: '' };
  const json = await res.json();
  const files = (json.files || []).filter((f) => /\.mp3$/i.test(f.name || ''));
  const meta = json.metadata || {};
  const published = toIsoDate(meta.publicdate || meta.addeddate) || new Date().toISOString();
  const description = cleanText(meta.description || '', 900);

  const episodes = files.map((f) => ({
    title: cleanText(String(f.name).replace(/\.mp3$/i, '').replace(/^\d+\s*/, ''), 300),
    description,
    audio_url: `https://archive.org/download/${encodeURIComponent(id)}/${encodeURIComponent(f.name)}`,
    duration_seconds: Math.round(Number(f.length) || 0),
    published_at: published,
    plays_count: hashPlays(f.name, 800, 42000),
  }));

  return {
    episodes,
    image: `https://archive.org/services/img/${encodeURIComponent(id)}`,
    feedTitle: cleanText(meta.title || show.collectionName, 300),
    feedDescription: description,
    genre: 'Islam',
  };
}

/* ------------------------------------------------------------------ */
/* Build the catalog                                                   */
/* ------------------------------------------------------------------ */

async function buildCatalog(hostsToImport = HOSTS) {
  const catalog = [];

  for (const host of hostsToImport) {
    process.stdout.write(`\n→ ${host.name_ar} … `);
    const shows = await findShows(host);
    if (shows.length === 0) {
      console.log('no shows found');
      continue;
    }

    const parsed = await pool(shows, 4, async (show) => {
      try {
        let feed;
        if (show.feedUrl.startsWith('archive:')) {
          feed = await archiveFeed(show.feedUrl.slice('archive:'.length), show);
        } else {
          const res = await fetchWithRetry(show.feedUrl, { timeout: 45000 });
          if (!res.ok) return null;
          feed = parseFeed(await res.text(), show);
        }
        if (host.episodeMatch) {
          const rx = new RegExp(host.episodeMatch, 'i');
          feed.episodes = feed.episodes.filter((ep) => rx.test(`${ep.title} ${ep.description}`));
        }
        if (feed.episodes.length === 0) return null;
        return { show, feed };
      } catch {
        return null;
      }
    });

    const podcasts = parsed.filter(Boolean).map(({ show, feed }) => {
      const text = `${feed.feedTitle} ${feed.feedDescription} ${feed.genre}`;
      const type = host.typeOverride || classify(text, host.type);
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

async function importCatalog(catalog, { wipe = true } = {}) {
  console.log('\n--- categories ---');
  const categories = await rest('/categories?select=id,name_ar');
  const categoryId = new Map();
  for (const c of categories) if (!categoryId.has(c.name_ar)) categoryId.set(c.name_ar, c.id);

  if (wipe) {
    console.log('--- clearing old content ---');
    await deleteAll('episodes');
    await deleteAll('podcasts');
    await deleteAll('hosts');
  } else {
    console.log('--- append mode: keeping existing content ---');
  }

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

let hostsToImport = HOSTS;
if (APPEND) {
  const existing = await rest('/hosts?select=slug');
  const have = new Set((existing || []).map((h) => h.slug));
  hostsToImport = HOSTS.filter((h) => !have.has(h.slug));
  console.log(`append mode: ${hostsToImport.length} new hosts (of ${HOSTS.length})`);
}

const catalog = await buildCatalog(hostsToImport);

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
  path.join(ROOT, 'supabase', APPEND ? 'catalog-preview-new.json' : 'catalog-preview.json'),
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
  const result = await importCatalog(catalog, { wipe: !APPEND });
  console.log('\n================ IMPORTED ================');
  console.log(result);
}
