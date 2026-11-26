import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Search, X, ArrowUpDown } from 'lucide-react';
import { Layout } from '@/components/layout';
import { HostCard } from '@/components/HostCard';
import { supabase } from '@/lib/supabase';
import { matchesAnyArabicSearch } from '@/lib/arabicSearch';
import {
  AHMED_ARABI_COURSES,
  AHMED_ARABI_EPISODE_IDS,
  AHMED_ARABI_HOST,
  AHMED_ARABI_SLUG,
} from '@/lib/ahmedArabi';
import {
  BASEL_MOUNES_COURSES,
  BASEL_MOUNES_EPISODES,
  BASEL_MOUNES_HOST,
  BASEL_MOUNES_SLUG,
} from '@/lib/baselMounes';
import {
  EBRAHIM_HEGAZY_EPISODES,
  EBRAHIM_HEGAZY_HOST,
  EBRAHIM_HEGAZY_PROGRAMS,
  EBRAHIM_HEGAZY_SLUG,
} from '@/lib/ebrahimHegazy';
import type { Host } from '@/types/podcast';

type SortOption = 'all' | 'fame' | 'followers' | 'popular' | 'newest' | 'az';

type HostStats = Host & {
  podcasts_count: number;
  episodes_count: number;
  total_plays: number;
  avg_rating: number;
  /** Categories of this presenter's own shows (plus their profile category). */
  categories: string[];
};

type PodcastAggregate = {
  plays_count: number | null;
  rating_avg: number | null;
  category?: { name_ar: string } | null;
  episodes?: { count: number }[];
};

const sortOptions: { value: SortOption; label: string; hint: string }[] = [
  { value: 'all', label: 'الكل', hint: 'الترتيب الافتراضي من المنصة' },
  {
    value: 'fame',
    label: 'الأكثر شهرة',
    hint: 'مؤشر مركّب: المتابعون والمشاهدات والتقييم والتوثيق وحجم المكتبة',
  },
  { value: 'followers', label: 'الأكثر متابعة', hint: 'حسب عدد المتابعين المسجّلين' },
  { value: 'popular', label: 'الأكثر شعبية', hint: 'حسب عدد مرات الاستماع الفعلية' },
  { value: 'newest', label: 'الأحدث', hint: 'حسب تاريخ إضافة المقدم' },
  { value: 'az', label: 'أ - ي', hint: 'حسب الاسم بالترتيب الأبجدي' },
];

const safeNumber = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

export default function HostsPage() {
  const [hosts, setHosts] = useState<HostStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('all');

  // RTL chip rows ignore a normal vertical mouse wheel. Turn it into horizontal
  // scrolling until either end is reached, then let the page scroll normally.
  const categoryStripRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const strip = categoryStripRef.current;
    if (!strip) return;
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      const maxScroll = strip.scrollWidth - strip.clientWidth;
      if (maxScroll <= 1) return;
      const delta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
      const atStart = strip.scrollLeft >= -1 && delta < 0;
      const atEnd = strip.scrollLeft <= -maxScroll + 1 && delta > 0;
      if (atStart || atEnd) return;
      event.preventDefault();
      strip.scrollLeft -= delta;
    };
    strip.addEventListener('wheel', onWheel, { passive: false });
    return () => strip.removeEventListener('wheel', onWheel);
  }, []);

  const fetchHosts = useCallback(async () => {
    const { data, error } = await supabase
      .from('hosts')
      .select('*, category:categories(*), podcasts(plays_count, rating_avg, category:categories(name_ar), episodes(count))')
      .order('followers_count', { ascending: false });

    if (error) {
      setLoading(false);
      return;
    }

    const mapped = ((data || []) as unknown as (Host & { podcasts?: PodcastAggregate[] })[])
      .map(({ podcasts, ...host }): HostStats => {
        const shows = podcasts || [];
        const rated = shows.filter((p) => safeNumber(p.rating_avg) > 0);

        // A presenter belongs to a category when their profile says so OR, more
        // reliably, when one of their actual podcasts is filed under it. This
        // keeps every chip tied to real content on the platform.
        const categoryNames = new Set<string>();
        if (host.category?.name_ar) categoryNames.add(host.category.name_ar);
        for (const show of shows) {
          if (show.category?.name_ar) categoryNames.add(show.category.name_ar);
        }

        return {
          ...host,
          podcasts_count: shows.length,
          episodes_count: shows.reduce((sum, p) => sum + safeNumber(p.episodes?.[0]?.count), 0),
          total_plays: shows.reduce((sum, p) => sum + safeNumber(p.plays_count), 0),
          avg_rating: rated.length
            ? rated.reduce((sum, p) => sum + safeNumber(p.rating_avg), 0) / rated.length
            : 0,
          categories: [...categoryNames],
        };
      });
    // د. أحمد العربي presents series inside other shows (فاهم / بدون ورق), so a
    // normal host_id aggregate would show zero. Merge the verified credit
    // counts whether or not the SQL migration has been applied yet.
    const ahmedCategory = AHMED_ARABI_HOST.category?.name_ar || 'روحاني / ديني';
    const ahmedStats: HostStats = {
      ...(mapped.find((h) => h.slug === AHMED_ARABI_SLUG) || AHMED_ARABI_HOST),
      podcasts_count: AHMED_ARABI_COURSES.length,
      episodes_count: AHMED_ARABI_EPISODE_IDS.length,
      avg_rating: 0,
      categories: [
        ...new Set([
          ...(mapped.find((h) => h.slug === AHMED_ARABI_SLUG)?.categories || []),
          ahmedCategory,
        ]),
      ],
    };
    const ahmedIndex = mapped.findIndex((h) => h.slug === AHMED_ARABI_SLUG);
    if (ahmedIndex >= 0) mapped[ahmedIndex] = ahmedStats;
    else mapped.push(ahmedStats);

    // م. باسل مؤنس has verified public lessons/recitations, but they are not
    // imported as podcast rows. Show his real curated counts instead of zeros.
    const baselCategory = BASEL_MOUNES_HOST.category?.name_ar || 'روحاني / ديني';
    const baselStats: HostStats = {
      ...(mapped.find((h) => h.slug === BASEL_MOUNES_SLUG) || BASEL_MOUNES_HOST),
      podcasts_count: BASEL_MOUNES_COURSES.length,
      episodes_count: BASEL_MOUNES_EPISODES.length,
      avg_rating: 0,
      categories: [
        ...new Set([
          ...(mapped.find((h) => h.slug === BASEL_MOUNES_SLUG)?.categories || []),
          baselCategory,
        ]),
      ],
    };
    const baselIndex = mapped.findIndex((h) => h.slug === BASEL_MOUNES_SLUG);
    if (baselIndex >= 0) mapped[baselIndex] = baselStats;
    else mapped.push(baselStats);

    // إبراهيم حجازي appears as a guest in real interviews published by other
    // shows; his public audio is curated client-side, not imported as a podcast.
    const hegazyCategory = EBRAHIM_HEGAZY_HOST.category?.name_ar || 'التقنية';
    const hegazyStats: HostStats = {
      ...(mapped.find((h) => h.slug === EBRAHIM_HEGAZY_SLUG) || EBRAHIM_HEGAZY_HOST),
      podcasts_count: EBRAHIM_HEGAZY_PROGRAMS.length,
      episodes_count: EBRAHIM_HEGAZY_EPISODES.length,
      avg_rating: 0,
      categories: [
        ...new Set([
          ...(mapped.find((h) => h.slug === EBRAHIM_HEGAZY_SLUG)?.categories || []),
          hegazyCategory,
        ]),
      ],
    };
    const hegazyIndex = mapped.findIndex((h) => h.slug === EBRAHIM_HEGAZY_SLUG);
    if (hegazyIndex >= 0) mapped[hegazyIndex] = hegazyStats;
    else mapped.push(hegazyStats);

    mapped.sort((a, b) => safeNumber(b.followers_count) - safeNumber(a.followers_count));

    setHosts(mapped);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchHosts();
  }, [fetchHosts]);

  // Only categories that really have presenters here. Sorting by how many
  // presenters each one has puts the useful chips first; duplicate category
  // names are merged because filtering uses the name, not a single row id.
  const categoryOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const h of hosts) {
      for (const name of h.categories) counts.set(name, (counts.get(name) || 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ar'))
      .map(([name]) => name);
  }, [hosts]);

  const filtered = useMemo(() => {
    const byName = (a: HostStats, b: HostStats) => a.name_ar.localeCompare(b.name_ar, 'ar') || a.id.localeCompare(b.id);
    const log = (n: number) => Math.log10(1 + safeNumber(n));
    const maxFollowers = Math.max(1, ...hosts.map((h) => safeNumber(h.followers_count)));
    const maxPlays = Math.max(1, ...hosts.map((h) => safeNumber(h.total_plays)));
    const maxEpisodes = Math.max(1, ...hosts.map((h) => safeNumber(h.episodes_count)));
    const norm = (value: number, max: number) => log(value) / log(max);
    const playsPerEpisode = (h: HostStats) => safeNumber(h.total_plays) / Math.max(1, safeNumber(h.episodes_count));

    // FAME is a reputation score, not a second follower sort. Each signal is
    // normalised with a log scale so the single biggest account cannot flatten
    // everyone else, and the weights are explicit instead of magic bonuses.
    const fameScore = (h: HostStats) =>
      0.42 * norm(h.followers_count, maxFollowers) +
      0.28 * norm(h.total_plays, maxPlays) +
      0.12 * norm(h.episodes_count, maxEpisodes) +
      0.10 * (Math.min(5, safeNumber(h.avg_rating)) / 5) +
      0.08 * (h.is_verified ? 1 : 0);

    return hosts
      .filter((h) => {
        if (
          searchQuery &&
          !matchesAnyArabicSearch(searchQuery, h.name_ar, h.specialty_ar, h.title_ar, h.bio_ar, h.country)
        ) return false;
        if (selectedCategory !== 'all' && !h.categories.includes(selectedCategory)) return false;
        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'all':
            // Keep the order returned by Supabase (followers count, descending).
            return 0;
          case 'fame': {
            const diff = fameScore(b) - fameScore(a);
            if (Math.abs(diff) > 1e-6) return diff;
            return safeNumber(b.followers_count) - safeNumber(a.followers_count) || byName(a, b);
          }
          case 'followers':
            return safeNumber(b.followers_count) - safeNumber(a.followers_count)
              || safeNumber(b.total_plays) - safeNumber(a.total_plays)
              || byName(a, b);
          case 'popular':
            return safeNumber(b.total_plays) - safeNumber(a.total_plays)
              || playsPerEpisode(b) - playsPerEpisode(a)
              || safeNumber(b.followers_count) - safeNumber(a.followers_count)
              || byName(a, b);
          case 'newest':
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime() || byName(a, b);
          case 'az':
            return byName(a, b);
        }
      });
  }, [hosts, searchQuery, selectedCategory, sortBy]);

  const hasFilters = !!searchQuery || selectedCategory !== 'all';

  return (
    <Layout title="المقدمون">
      {/* Hero */}
      <div className="mb-6 animate-fade-in">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-700 to-primary-900 p-6">
          <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-accent-500/20 rounded-full blur-2xl" />
          <div className="relative">
            <h2 className="text-xl font-extrabold text-white">المقدمون والخبراء</h2>
            <p className="text-primary-100 text-sm mt-1">
              {hosts.length} مقدم من العلماء والأطباء والخبراء والمتحدثين
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4 relative">
        <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ابحث عن مقدم أو تخصص..."
          className="w-full pr-11 pl-11 py-3 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Category chips */}
      <div ref={categoryStripRef} className="flex gap-2 overflow-x-auto no-scrollbar scroll-smooth mb-4">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-4 py-2 rounded-xl font-semibold text-sm whitespace-nowrap transition-all ${
            selectedCategory === 'all'
              ? 'bg-primary-600 text-white'
              : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          الكل
        </button>
        {categoryOptions.map((name) => (
          <button
            key={name}
            onClick={() => setSelectedCategory(name)}
            className={`px-4 py-2 rounded-xl font-semibold text-sm whitespace-nowrap transition-all ${
              selectedCategory === name
                ? 'bg-primary-600 text-white'
                : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      {/* Sort */}
      <div className="flex items-center gap-2 mb-5">
        <ArrowUpDown size={16} className="text-neutral-400" />
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {sortOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSortBy(opt.value)}
              title={opt.hint}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                sortBy === opt.value
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300'
                  : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 rounded-full border-4 border-primary-600 border-t-transparent animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 mb-3">
            <Search size={28} />
          </div>
          <p className="text-neutral-500 dark:text-neutral-400 font-semibold">لا توجد نتائج مطابقة</p>
        </div>
      ) : (
        <>
          {hasFilters && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
              {filtered.length} نتيجة
            </p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.map((host) => (
              <HostCard key={host.id} host={host} />
            ))}
          </div>
        </>
      )}
    </Layout>
  );
}
