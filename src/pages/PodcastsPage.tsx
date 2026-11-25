import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Search, Headphones, X, SlidersHorizontal } from 'lucide-react';
import { Layout } from '@/components/layout';
import { PodcastCard } from '@/components/PodcastCard';
import { CarouselSection } from '@/components/CarouselSection';
import { FeaturedHosts } from '@/components/FeaturedHosts';
import { OptimizedImage } from '@/components/OptimizedImage';
import { Badge } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useAudioPlayer } from '@/context/AudioPlayerContext';
import { supabase } from '@/lib/supabase';
import { readCatalogCache, writeCatalogCache } from '@/lib/catalogCache';
import { matchesAnyArabicSearch } from '@/lib/arabicSearch';
import type { Podcast, Category, Episode, ListeningHistory } from '@/types/podcast';
import { typeLabels, levelLabels, interestToCategoryMap } from '@/types/podcast';

type FilterType = 'all' | 'religious' | 'scientific' | 'cultural' | 'motivational' | 'professional' | 'comedy' | 'leadership' | 'communication' | 'improv';
type FilterLevel = 'all' | 'beginner' | 'intermediate' | 'expert';
type CategoryWithCount = Category & { podcast_count?: number };

const PAGE_SIZE = 24;

export default function PodcastsPage() {
  const { user, profile } = useAuth();
  const { playEpisode } = useAudioPlayer();

  // Paint the last good catalog from localStorage immediately, then refresh it
  // in the background. The first visit is unchanged; every revisit is instant.
  const cachedCatalog = useRef(readCatalogCache()).current;
  const [allPodcasts, setAllPodcasts] = useState<Podcast[]>(cachedCatalog?.podcasts || []);
  const [categories, setCategories] = useState<CategoryWithCount[]>(
    (cachedCatalog?.categories || []) as CategoryWithCount[]
  );
  const [continueEpisodes, setContinueEpisodes] = useState<(Episode & { podcast?: Podcast })[]>([]);
  const [loading, setLoading] = useState(!cachedCatalog);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [episodeCovers, setEpisodeCovers] = useState<Map<string, string>>(new Map());

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterLevel, setFilterLevel] = useState<FilterLevel>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Rendering hundreds of covers at once starves the connection and makes
  // starting playback feel slow. Show a page at a time instead.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchQuery, selectedCategory, filterType, filterLevel]);

  // A horizontal chip row in an RTL page does not respond to a normal mouse
  // wheel. Translate vertical wheel movement into horizontal scrolling, while
  // still letting the page scroll once either end is reached.
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

  const fetchPodcasts = useCallback(async () => {
    const [{ data: podcastsData }, { data: categoriesData }, { data: favData }, { data: episodeCoverData }] = await Promise.all([
      // Only card/filter fields — pulling every long description for 766 shows
      // made the list slower to open without being displayed anywhere.
      supabase
        .from('podcasts')
        .select('id,title,cover_url,type,audience_level,host_name,created_at,category_id,host_id,category:categories(name_ar),host:hosts(id,name_ar,slug,is_verified,photo_url)')
        .order('created_at', { ascending: false }),
      supabase.from('categories').select('*, podcasts(count)').order('name_ar'),
      user ? supabase.from('favorites').select('podcast_id').eq('user_id', user.id) : Promise.resolve({ data: null }),
      // Only episodes that actually carry artwork; the earliest one is the
      // podcast's downloaded cover. This is a tiny query, not the whole feed.
      supabase
        .from('episodes')
        .select('podcast_id,image_url,published_at')
        .not('image_url', 'is', null)
        .order('published_at', { ascending: true }),
    ]);

    const favSet = new Set<string>();
    (favData || []).forEach((f: { podcast_id: string }) => favSet.add(f.podcast_id));
    setFavorites(favSet);

    const covers = new Map<string, string>();
    (episodeCoverData || []).forEach((e: { podcast_id: string; image_url: string | null }) => {
      if (e.image_url && !covers.has(e.podcast_id)) covers.set(e.podcast_id, e.image_url);
    });
    setEpisodeCovers(covers);

    const mappedCategories = ((categoriesData || []) as unknown as (CategoryWithCount & { podcasts?: { count: number }[] })[])
      .map(({ podcasts, ...category }) => ({
        ...category,
        podcast_count: podcasts?.[0]?.count ?? 0,
      }));

    if (podcastsData) {
      const enriched = (podcastsData as Record<string, unknown>[]).map((p) => ({
        ...p,
        is_favorited: favSet.has(p.id as string),
      })) as Podcast[];
      setAllPodcasts(enriched);
      // Strip user-specific flags before caching so another account never
      // inherits the previous user's filled favourite hearts on first paint.
      const rawPodcasts = enriched.map((p) => {
        const raw = { ...p };
        delete raw.is_favorited;
        return raw;
      });
      writeCatalogCache(rawPodcasts, mappedCategories);
    }
    if (categoriesData) setCategories(mappedCategories);
    setLoading(false);
  }, [user]);

  const fetchContinueListening = useCallback(async () => {
    if (!user) return;
    const { data: historyData } = await supabase
      .from('listening_history')
      .select('*, episode:episodes(*, podcast:podcasts(*, host:hosts(*)))')
      .eq('user_id', user.id)
      .eq('completed', false)
      .gt('progress_seconds', 5)
      .order('updated_at', { ascending: false })
      .limit(10);

    if (historyData && historyData.length > 0) {
      const episodes = historyData
        .map((h: ListeningHistory & { episode?: Episode & { podcast?: Podcast } }) => {
          if (!h.episode) return null;
          // Carry the saved position so "continue listening" can seek after the
          // stream starts. Other play buttons stay on the instant-start path.
          return { ...h.episode, podcast: h.episode.podcast, resumeAt: h.progress_seconds };
        })
        .filter(Boolean) as (Episode & { podcast?: Podcast; resumeAt?: number })[];
      setContinueEpisodes(episodes);
    }
  }, [user]);

  useEffect(() => {
    fetchPodcasts();
    fetchContinueListening();
  }, [fetchPodcasts, fetchContinueListening]);

  const toggleFavorite = useCallback(async (podcastId: string) => {
    if (!user) return;
    const isFav = favorites.has(podcastId);
    setFavorites((prev) => {
      const next = new Set(prev);
      if (isFav) next.delete(podcastId);
      else next.add(podcastId);
      return next;
    });
    setAllPodcasts((prev) =>
      prev.map((p) => (p.id === podcastId ? { ...p, is_favorited: !isFav } : p))
    );

    if (isFav) {
      await supabase.from('favorites').delete().eq('user_id', user.id).eq('podcast_id', podcastId);
    } else {
      await supabase.from('favorites').insert({ user_id: user.id, podcast_id: podcastId });
    }
  }, [user, favorites]);

  // The DB holds several rows per category name. Merge the duplicates, then
  // show the richest categories first — a useful order that stays correct as
  // the catalog grows instead of an arbitrary alphabetical list.
  const categoryOptions = useMemo(() => {
    const merged = new Map<string, CategoryWithCount>();
    categories.forEach((category) => {
      if (!category.name_ar) return;
      const existing = merged.get(category.name_ar);
      if (existing) {
        existing.podcast_count = (existing.podcast_count || 0) + (category.podcast_count || 0);
      } else {
        merged.set(category.name_ar, { ...category });
      }
    });
    return [...merged.values()].sort(
      (a, b) => (b.podcast_count || 0) - (a.podcast_count || 0) || a.name_ar.localeCompare(b.name_ar, 'ar')
    );
  }, [categories]);

  // Filtered podcasts for search/grid view
  const filteredPodcasts = allPodcasts.filter((p) => {
    if (
      searchQuery &&
      !matchesAnyArabicSearch(
        searchQuery,
        p.title,
        p.host_name,
        p.host?.name_ar,
        p.description,
        p.category?.name_ar,
      )
    ) return false;
    // The categories table contains several rows with the same Arabic name,
    // so filter by the joined name, not by one specific duplicate id.
    if (selectedCategory !== 'all' && p.category?.name_ar !== selectedCategory) return false;
    if (filterType !== 'all' && p.type !== filterType) return false;
    if (filterLevel !== 'all' && p.audience_level !== filterLevel) return false;
    return true;
  });

  // Recommended: match user interests to category names
  const recommended = profile?.interests && profile.interests.length > 0
    ? allPodcasts
        .filter((p) => {
          const catName = p.category?.name_ar;
          return profile.interests.some((interest) => interestToCategoryMap[interest] === catName);
        })
        .slice(0, 12)
    : allPodcasts.slice(0, 12);

  // New this week: created in last 7 days. The catalog was imported at once,
  // so cap the carousel — rendering all 740 covers here delays playback.
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const newThisWeek = allPodcasts.filter((p) => new Date(p.created_at) > weekAgo).slice(0, 12);

  // Most popular: just use all for now (would need play counts)
  const mostPopular = [...allPodcasts].sort((a, b) => a.title.localeCompare(b.title)).slice(0, 10);

  const hasActiveFilters = searchQuery || selectedCategory !== 'all' || filterType !== 'all' || filterLevel !== 'all';

  const handlePlayEpisodeFromHistory = (ep: Episode & { podcast?: Podcast; resumeAt?: number }) => {
    if (ep.podcast) {
      playEpisode(ep, ep.podcast, continueEpisodes as Episode[], ep.resumeAt || 0);
    }
  };

  return (
    <Layout title="البودكاست">
      {/* Hero banner */}
      <div className="mb-6 animate-fade-in">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-700 to-primary-900 p-6">
          <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-accent-500/20 rounded-full blur-2xl" />
          <div className="relative flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center text-white">
              <Headphones size={30} />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white">بودكاست Sada</h2>
              <p className="text-primary-100 text-sm mt-1">{allPodcasts.length} بودكاست في تطوير الذات</p>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Hosts */}
      {!hasActiveFilters && <FeaturedHosts />}

      {/* Search bar */}
      <div className="mb-4 relative">
        <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ابحث عن بودكاست أو مقدم... (يدعم البحث بدون همزات/تشكيل)"
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

      {/* Category chips + filter toggle */}
      <div className="flex items-center gap-2 mb-4">
        <div ref={categoryStripRef} className="flex-1 flex gap-2 overflow-x-auto no-scrollbar">
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
          {categoryOptions.map((cat) => (
            <button
              key={cat.name_ar}
              onClick={() => setSelectedCategory(cat.name_ar)}
              title={`${cat.name_ar} — ${(cat.podcast_count || 0).toLocaleString('ar-EG')} بودكاست`}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold text-sm whitespace-nowrap transition-all ${
                selectedCategory === cat.name_ar
                  ? 'bg-primary-600 text-white'
                  : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              <span>{cat.name_ar}</span>
              {!!cat.podcast_count && (
                <span className={`text-[10px] font-bold ${selectedCategory === cat.name_ar ? 'text-white/75' : 'text-neutral-400'}`}>
                  {cat.podcast_count.toLocaleString('ar-EG')}
                </span>
              )}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl font-semibold text-sm transition-all ${
            showFilters || filterType !== 'all' || filterLevel !== 'all'
              ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400'
              : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          <SlidersHorizontal size={16} />
          فلترة
        </button>
      </div>

      {/* Expandable filters */}
      {showFilters && (
        <div className="mb-6 p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 animate-fade-in-up">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">النوع</p>
              <div className="flex flex-wrap gap-2">
                {(['all', 'religious', 'scientific', 'cultural', 'motivational', 'professional', 'comedy', 'leadership', 'communication', 'improv'] as FilterType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilterType(t)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                      filterType === t
                        ? 'bg-primary-600 text-white'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                    }`}
                  >
                    {t === 'all' ? 'الكل' : typeLabels[t]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">المستوى</p>
              <div className="flex flex-wrap gap-2">
                {(['all', 'beginner', 'intermediate', 'expert'] as FilterLevel[]).map((l) => (
                  <button
                    key={l}
                    onClick={() => setFilterLevel(l)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                      filterLevel === l
                        ? 'bg-primary-600 text-white'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                    }`}
                  >
                    {l === 'all' ? 'الكل' : levelLabels[l]}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {(filterType !== 'all' || filterLevel !== 'all') && (
            <button
              onClick={() => { setFilterType('all'); setFilterLevel('all'); }}
              className="mt-3 text-sm font-semibold text-primary-600 dark:text-primary-400 hover:underline"
            >
              مسح الفلاتر
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 rounded-full border-4 border-primary-600 border-t-transparent animate-spin" />
        </div>
      ) : hasActiveFilters ? (
        // Grid view when searching/filtering
        <div>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
            {filteredPodcasts.length} نتيجة
          </p>
          {filteredPodcasts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 mb-3">
                <Search size={28} />
              </div>
              <p className="text-neutral-500 dark:text-neutral-400 font-semibold">لا توجد نتائج مطابقة</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredPodcasts.slice(0, visibleCount).map((p) => (
                <PodcastCard key={p.id} podcast={p} onToggleFavorite={toggleFavorite} episodeCover={episodeCovers.get(p.id)} />
              ))}
            </div>
          )}
          {filteredPodcasts.length > visibleCount && (
            <button
              onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-primary-200 bg-primary-50/60 py-3 text-sm font-bold text-primary-700 transition-all hover:border-primary-400 hover:bg-primary-100 dark:border-primary-900 dark:bg-primary-950/20 dark:text-primary-300 dark:hover:bg-primary-900/30"
            >
              عرض المزيد ({filteredPodcasts.length - visibleCount} بودكاست متبقٍ)
            </button>
          )}
        </div>
      ) : (
        // Carousel view: show curated sections
        <div>
          {/* Continue listening */}
          {continueEpisodes.length > 0 && (
            <CarouselSection title="أكمل الاستماع" subtitle="عُد إلى حيث توقفت">
              {continueEpisodes.map((ep) => (
                <div key={ep.id} className="flex-shrink-0 w-72 group">
                  <button
                    onClick={() => handlePlayEpisodeFromHistory(ep)}
                    className="card-base p-3 w-full text-right card-hover block"
                  >
                    <div className="relative w-full h-32 rounded-xl overflow-hidden mb-2 bg-neutral-200 dark:bg-neutral-800">
                      {ep.podcast?.cover_url && (
                        <OptimizedImage
                          src={ep.podcast.cover_url}
                          alt={ep.podcast.title}
                          width={480}
                          sizes="(max-width: 640px) 80vw, 288px"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                      <div className="absolute bottom-2 left-2 w-9 h-9 rounded-full bg-primary-600 text-white flex items-center justify-center shadow-lg">
                        <Headphones size={16} />
                      </div>
                    </div>
                    <p className="text-sm font-bold text-neutral-900 dark:text-white truncate">{ep.title}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{ep.podcast?.title}</p>
                  </button>
                </div>
              ))}
            </CarouselSection>
          )}

          {/* Recommended for you */}
          {recommended.length > 0 && (
            <CarouselSection
              title="موصى لك"
              subtitle={profile?.interests?.length ? "بناءً على اهتماماتك" : "اختيارات مميزة"}
            >
              {recommended.map((p) => (
                <PodcastCard key={p.id} podcast={p} onToggleFavorite={toggleFavorite} episodeCover={episodeCovers.get(p.id)} compact />
              ))}
            </CarouselSection>
          )}

          {/* New this week */}
          {newThisWeek.length > 0 && (
            <CarouselSection title="جديد هذا الأسبوع" subtitle="أحدث الإضافات">
              {newThisWeek.map((p) => (
                <PodcastCard key={p.id} podcast={p} onToggleFavorite={toggleFavorite} episodeCover={episodeCovers.get(p.id)} compact />
              ))}
            </CarouselSection>
          )}

          {/* Most popular */}
          <CarouselSection title="الأكثر استماعاً" subtitle="ما يستمع إليه الجميع">
            {mostPopular.map((p) => (
              <PodcastCard key={p.id} podcast={p} onToggleFavorite={toggleFavorite} episodeCover={episodeCovers.get(p.id)} compact />
            ))}
          </CarouselSection>

          {/* Browse all */}
          <div className="mb-4">
            <h2 className="text-lg font-extrabold text-neutral-900 dark:text-white mb-4">تصفّح الكل</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {allPodcasts.slice(0, visibleCount).map((p) => (
                <PodcastCard key={p.id} podcast={p} onToggleFavorite={toggleFavorite} episodeCover={episodeCovers.get(p.id)} />
              ))}
            </div>
            {allPodcasts.length > visibleCount && (
              <button
                onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-primary-200 bg-primary-50/60 py-3 text-sm font-bold text-primary-700 transition-all hover:border-primary-400 hover:bg-primary-100 dark:border-primary-900 dark:bg-primary-950/20 dark:text-primary-300 dark:hover:bg-primary-900/30"
              >
                عرض المزيد ({allPodcasts.length - visibleCount} بودكاست متبقٍ)
              </button>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}
