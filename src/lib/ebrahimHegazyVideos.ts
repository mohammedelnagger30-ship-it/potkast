/**
 * Public videos from إبراهيم حجازي's own YouTube channel (@Zigoo0).
 *
 * These are VIDEOS, not Sada audio episodes: YouTube has no stable unsigned
 * media URL, so playback uses YouTube's official embed player. They are never
 * counted in the episode/stat counters and never presented as audio enclosures.
 * Titles and IDs were read from the public Videos tab of the channel and each
 * video was checked through YouTube's public oEmbed endpoint (HTTP 200).
 */

export interface HegazyVideo {
  id: string;
  title: string;
}

export const EBRAHIM_HEGAZY_YOUTUBE_CHANNEL = 'https://www.youtube.com/@Zigoo0';

export const EBRAHIM_HEGAZY_VIDEOS: HegazyVideo[] = [
  { id: 'neaUG2dPcH4', title: 'رحلتي من Biomedical Student للعمل في Booking هولندا ثم Head of Engineering' },
  { id: 'spFWEnLyaHw', title: 'يوم في حياة Security Engineer' },
  { id: 'MUmlyhaGQyY', title: 'يوم في حياة Malware Analyst' },
  { id: 'I9nTTSv0te8', title: 'يوم في حياة Ahmed Sherif - Red Team Lead' },
  { id: 'CfFea2mpO-k', title: 'يوم في حياة ال Pentester — مع حمزة عبدالرحيم' },
  { id: 'ompZWkWsn9A', title: 'يوم في حياة ال Pentester — مع أحمد الهادي' },
  { id: 'RYYT7wWxWAw', title: 'مقابلتي مع الإتحاد السعودي للأمن السيبراني وعشرين نصيحة تساعدك على اكتشاف الثغرات' },
  { id: 'ckHQNUB51MQ', title: 'شرح مفصل وأسئلة وأجوبة عن كيف تبدأ في مجال Bug Bounty Hunting' },
  { id: 'Zb-Fp62N2y8', title: 'Red Teaming - Local Domain Admin Impersonation (Mitm6 & LDAP Relay)' },
  { id: 'I5qxlcnQQUI', title: 'تجربتي في الإنترفيو والعمل مع HackerOne ونصائح لمكتشفي الثغرات' },
  { id: 'Oo0QTeV6WaY', title: 'كيف تحصل على وظيفة في مجال أمن المعلومات في الدول المختلفة' },
  { id: 'f3hP49LGoik', title: 'طريقك لمجالات Pentesting و Redteaming و Bug Hunting' },
  { id: 'E9yyhxzxeok', title: '٤٧ — ١٥ طريقة لاكتشاف ثغرات صفحات رفع الملفات' },
  { id: 'zmAFVRMhqPk', title: '٤٦ — Google bug bounty hunting (Part 2)' },
  { id: 'USyJjpjXEao', title: '٤٥ — Google bug bounty hunting (Part 1)' },
  { id: 'nmxoQP0Ca5k', title: '٤٤ — طريقتي في اختبار اختراق تطبيق ويب (الجزء ٢)' },
  { id: 'zvJ3irTVDfc', title: '٤٤ — طريقتي في اختبار اختراق تطبيق ويب (الجزء ١)' },
  { id: 'mCC-i4DaCgM', title: '٤٣ — ثغرات Cache Poisoning و Cache Deception' },
  { id: 'wRF9dAo7-W8', title: 'ازاي تنظم أولوياتك؟' },
  { id: 'klBJDJ5s3XM', title: '٤٢ — شرح ثغرات Host header attacks' },
  { id: 'FOVnU-ud4V0', title: '٤١ — Local/Remote file inclusion و Path Traversal' },
  { id: '9e1rSOH63ME', title: '٤٠ — شرح ثغرة Server-Side Request Forgery (SSRF)' },
  { id: 'V9Bc_Addfps', title: '٣٩ — Information disclosure tips and tricks' },
  { id: 'KYVcCoksjSQ', title: '٣٨ — كيف تتربح مادياً من اكتشاف ثغرات المواقع (الجزء ٢)' },
  { id: 'z0qEQ-fF7uI', title: '٣٧ — كيف تتربح مادياً من اكتشاف ثغرات المواقع (الجزء ١)' },
  { id: 'Vb4md5w6JJ8', title: '٣٦ — ثغرات CSRF مع مثال على ثغرة خطيرة في تويتر' },
  { id: 'PRDO0ZjYGfc', title: '٣٥ — الجزء الثاني من حلول تحديات XSS' },
  { id: 'TeIK1244sSk', title: '٣٤ — الجزء الأول من حلول تحديات XSS' },
  { id: 'TQbKf4ZkzZ0', title: '٣٣ — كيف تعمل الـ WAF وتجاوز مرشحات XSS' },
  { id: 'OcrmPMSjdSw', title: '٣٢ — SOP و CORS و CSP واستغلال CORS الخاطئ' },
  { id: 'ZfYG3U6XueM', title: '٣١ — شرح Advanced XSS Exploitation' },
  { id: 'qp264U2QyY8', title: '٣٠ — ترقيع ثغرات XSS و response headers' },
  { id: 'xiw_O5shcK4', title: '٢٩ — شرح ثغرات XSS (Reflected و Stored و DOM)' },
  { id: 'sUUAzIa7F_A', title: '٢٨ — لماذا تحدث الثغرات؟' },
  { id: 'PsdimP_-TKY', title: '٢٧ — HTTP Methods و Request/Response Headers' },
  { id: 'JEsyUw7WuIM', title: '٢٦ — Burp Tabs part 2' },
  { id: 'OaXEDgW8SUE', title: '٢٥ — Burp Suite Tabs Part 1' },
  { id: '5f7Z52I0Y2s', title: '٢٤ — شرح أداة BurpSuite' },
  { id: 'uQcCa-xVnSM', title: '٢٣ — Nmap MoreOver' },
  { id: 'WpWlTOnOA94', title: '٢٢ — Advanced Nmap' },
  { id: 'Ru4mFT0yANo', title: '٢١ — شرح أداة NMAP' },
  { id: 'Qo37c0v9Gdo', title: '١٩ — Explaining Subdomain Takeover and DNS Records' },
  { id: 'ynbtZbwcCjA', title: '١٨ — ما هو ال DNS وكيف يعمل' },
  { id: '1tESU4F4Gt8', title: '٢٠ — كيف تكتشف ثغرات Subdomain Takeover' },
  { id: 'fiFBpFjfYyo', title: '١٧ — شرح TCP و UDP بالتفصيل' },
  { id: '8XKbJWnktc8', title: '١٦ — What Happens When You Type Google.com (in Arabic)' },
  { id: 'Iws5GpUVnq4', title: '١٥ — كيف يعمل HTTPS' },
  { id: '8lW2kvCVpHc', title: '١٤ — ما هو Asymmetric Encryption' },
  { id: 'LOtK2IDBGik', title: '١٣ — ما هو Symmetric Encryption' },
  { id: 'gOos5go5h2c', title: '١٢ — What Is Encoding and How Does It Work' },
  { id: '4TBStYr8t4g', title: '١١ — ما هو Hashing وكيف يعمل' },
  { id: 'LKIXbNW-B5g', title: '١٠ — Linux Command Part 5' },
  { id: 'C8pPNa79K2Y', title: '٩ — Linux Command Part 4' },
  { id: 'PxRm5GKSNMI', title: '٨ — Linux Command Part 3' },
  { id: 'Jp2iAAGqADw', title: '٧ — Linux Command Line Part 2' },
  { id: 'Lki6Gu8opGA', title: '٦ — Linux Command Line Part 1' },
  { id: 'lN7JLDvP3_8', title: '٥ — Introduction to Linux' },
  { id: 'L-7dN3C-cOE', title: '٤ — Exploiting leaked databases for Penetration Testers (بالعربي)' },
  { id: 'MUN1CaC-wPE', title: '٣ — شرح تسريبات قواعد بيانات المواقع الشهيرة' },
  { id: 'F7b48a2pek4', title: '٢ — Downloading and Setting Up Course Requirements' },
  { id: 'BjfCWSFmIFI', title: '١ — مقدمة الكورس' },
  { id: 'OPlexp-1XxU', title: 'Twitter unrestricted file creation and possible RCE' },
  { id: 'eIZtUIkkL2w', title: 'How Chinese names look like!' },
  { id: 'xpht2R_0cEg', title: 'Paypal critical vulnerability to steal unencrypted credit cards' },
  { id: 'ccxK6vlvbxM', title: 'حينما يأخذ اللاعب مكان حارس المرمى 😄' },
  { id: '2K2g9NT3VZM', title: 'Remote Reset Password — Yahoo marketing solutions' },
  { id: 'lIMgA5adY3s', title: 'RCE affecting Yahoo, Microsoft MSN and Orange' },
  { id: 'B6kDUk-ehOE', title: 'Yahoo RCE Detector — WebPwn3r Demo' },
  { id: 'V3CHd6ePICo', title: 'Yahoo.com Remote Code Execution' },
  { id: 'kh4yxZbp6Gw', title: 'Twitter Unvalidated Redirection Vulnerability' },
  { id: 'enpDJ8MfiC8', title: 'Twitter Unrestricted File Upload Vulnerability' },
  { id: '4g2uwJ7H7zM', title: '#POC — Twitter Unrestricted File Upload Vulnerability' },
  { id: 'juZ9GjJRyFQ', title: 'Kaspersky Unvalidated Redirection Vulnerability' },
  { id: 'Odko5PTKA-Q', title: 'Avira SQL Injection Vulnerability' },
];

export const youtubeThumbnail = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
export const youtubeWatchUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`;
export const youtubeEmbedUrl = (id: string) =>
  `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&playsinline=1`;
