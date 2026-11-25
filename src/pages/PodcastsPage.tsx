import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Search, Headphones, X, SlidersHorizontal } from 'lucide-react';
import { Layout } from '@/components/layout';
import { PodcastCard } from '@/components/PodcastCard';
import { CarouselSection } from '@/components/CarouselSection';
import { FeaturedHosts } from '@/components/FeaturedHosts';
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

const PAGE_SIZE = 24;

export default function PodcastsPage() {
  const { user, profile } = useAuth();
  const { playEpisode } = useAudioPlayer();

  // Paint the last good catalog from localStorage immediately, then refresh it
  // in the background. The first visit is unchanged; every revisit is instant.
  const cachedCatalog = useRef(readCatalogCache()).current;
  const [allPodcasts, setAllPodcasts] = useState<Podcast[]>(cachedCatalog?.podcasts || []);
  const [categories, setCategories] = useState<Category[]>(cachedCatalog?.categories || []);
  const [continueEpisodes, setContinueEpisodes] = useState<(Episode & { podcast?: Podcast })[]>([]);
  const [loading, setLoading] = useState(!cachedCatalog);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

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

  const fetchPodcasts = useCallback(async () => {
    const [{ data: podcastsData }, { data: categoriesData }, { data: favData }] = await Promise.all([
      // Only card/filter fields — pulling every long description for 766 shows
      // made the list slower to open without being displayed anywhere.
      supabase
        .from('podcasts')
        .select('id,title,cover_url,type,audience_level,host_name,created_at,category_id,host_id,category:categories(name_ar),host:hosts(id,name_ar,slug,is_verified,photo_url)')
        .order('created_at', { ascending: false }),
      supabase.from('categories').select('*').order('name_ar'),
      user ? supabase.from('favorites').select('podcast_id').eq('user_id', user.id) : Promise.resolve({ data: null }),
    ]);

    const favSet = new Set<string>();
    (favData || []).forEach((f: { podcast_id: string }) => favSet.add(f.podcast_id));
    setFavorites(favSet);

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
      writeCatalogCache(rawPodcasts, (categoriesData || []) as Category[]);
    }
    if (categoriesData) setCategories(categoriesData as Category[]);
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

  // The DB currently holds 5 rows per category name (repeated seeds).
  // Show each name once and keep it working regardless of which duplicate id
  // a podcast points at.
  const categoryOptions = useMemo(() => {
    const seen = new Set<string>();
    return categories.filter((c) => {
      if (!c.name_ar || seen.has(c.name_ar)) return false;
      seen.add(c.name_ar);
      return true;
    });
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
        <div className="flex-1 flex gap-2 overflow-x-auto no-scrollbar">
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
              className={`px-4 py-2 rounded-xl font-semibold text-sm whitespace-nowrap transition-all ${
                selectedCategory === cat.name_ar
                  ? 'bg-primary-600 text-white'
                  : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              {cat.name_ar}
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
                <PodcastCard key={p.id} podcast={p} onToggleFavorite={toggleFavorite} />
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
                        <img
                          src={ep.podcast.cover_url}
                          alt={ep.podcast.title}
                          loading="lazy"
                          decoding="async"
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
                <PodcastCard key={p.id} podcast={p} onToggleFavorite={toggleFavorite} compact />
              ))}
            </CarouselSection>
          )}

          {/* New this week */}
          {newThisWeek.length > 0 && (
            <CarouselSection title="جديد هذا الأسبوع" subtitle="أحدث الإضافات">
              {newThisWeek.map((p) => (
                <PodcastCard key={p.id} podcast={p} onToggleFavorite={toggleFavorite} compact />
              ))}
            </CarouselSection>
          )}

          {/* Most popular */}
          <CarouselSection title="الأكثر استماعاً" subtitle="ما يستمع إليه الجميع">
            {mostPopular.map((p) => (
              <PodcastCard key={p.id} podcast={p} onToggleFavorite={toggleFavorite} compact />
            ))}
          </CarouselSection>

          {/* Browse all */}
          <div className="mb-4">
            <h2 className="text-lg font-extrabold text-neutral-900 dark:text-white mb-4">تصفّح الكل</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {allPodcasts.slice(0, visibleCount).map((p) => (
                <PodcastCard key={p.id} podcast={p} onToggleFavorite={toggleFavorite} />
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
