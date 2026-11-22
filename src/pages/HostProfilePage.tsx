import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowRight,
  Play,
  Pause,
  BadgeCheck,
  Users,
  Mic,
  Headphones,
  Youtube,
  Twitter,
  Instagram,
  Globe,
  UserPlus,
  UserCheck,
} from 'lucide-react';
import { Layout } from '@/components/layout';
import { Button, Badge, ProgressBar } from '@/components/ui';
import { PodcastCard } from '@/components/PodcastCard';
import { DownloadButton } from '@/components/DownloadButton';
import { useAuth } from '@/context/AuthContext';
import { useAudioPlayer } from '@/context/AudioPlayerContext';
import { useProgress } from '@/context/ProgressContext';
import { supabase } from '@/lib/supabase';
import type { Host, Podcast, Episode } from '@/types/podcast';
import { formatCount, formatDuration, formatRelativeTime } from '@/types/podcast';

type FlatTab = 'latest' | 'top';
type EpisodeWithPod = Episode & { podcast?: Podcast };
type PodcastWithCount = Podcast & { episodes_count?: number };

interface ListState {
  items: EpisodeWithPod[];
  hasMore: boolean;
  loading: boolean;
}

const PAGE_SIZE = 30;
const BULK_PAGE_SIZE = 500;

const socialIcons: Record<string, typeof Youtube> = {
  youtube: Youtube,
  twitter: Twitter,
  instagram: Instagram,
  website: Globe,
};

const socialLabels: Record<string, string> = {
  youtube: 'يوتيوب',
  twitter: 'تويتر',
  instagram: 'إنستغرام',
  website: 'الموقع',
};

function stripHtml(value: string): string {
  return String(value || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|li|h\d)>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export default function HostProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentEpisode, isPlaying, togglePlay, playEpisode } = useAudioPlayer();
  const { getHostProgress } = useProgress();

  const [host, setHost] = useState<Host | null>(null);
  const [podcasts, setPodcasts] = useState<PodcastWithCount[]>([]);
  const [totalEpisodes, setTotalEpisodes] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<FlatTab>('latest');
  const [loadingAll, setLoadingAll] = useState(false);

  const [flat, setFlat] = useState<Record<FlatTab, ListState>>({
    latest: { items: [], hasMore: true, loading: false },
    top: { items: [], hasMore: true, loading: false },
  });

  const podMap = useMemo(() => new Map(podcasts.map((p) => [p.id, p])), [podcasts]);
  const podIds = useMemo(() => podcasts.map((p) => p.id), [podcasts]);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      setHost(null);

      const { data: hostData } = await supabase
        .from('hosts')
        .select('*, category:categories(*)')
        .eq('slug', slug)
        .maybeSingle();

      if (!hostData) {
        if (!cancelled) setLoading(false);
        return;
      }
      const hostRow = hostData as Host;

      // Every podcast of this host, each with its real episode count.
      const { data: podData } = await supabase
        .from('podcasts')
        .select('*, category:categories(*), episodes(count)')
        .eq('host_id', hostRow.id)
        .order('created_at', { ascending: false })
        .range(0, 999);

      const pods = ((podData || []) as unknown as (PodcastWithCount & { episodes?: { count: number }[] })[]).map(
        ({ episodes: counted, ...rest }) => ({ ...rest, episodes_count: counted?.[0]?.count ?? 0 })
      );
      const map = new Map(pods.map((p) => [p.id, p]));
      const ids = pods.map((p) => p.id);
      const total = pods.reduce((sum, p) => sum + (p.episodes_count || 0), 0);

      // First page of the newest episodes (so "تشغيل الكل" works right away).
      let latestItems: EpisodeWithPod[] = [];
      if (ids.length > 0) {
        const { data: epData } = await supabase
          .from('episodes')
          .select('*')
          .in('podcast_id', ids)
          .order('published_at', { ascending: false })
          .range(0, PAGE_SIZE - 1);
        latestItems = ((epData || []) as Episode[]).map((e) => ({ ...e, podcast: map.get(e.podcast_id) }));
      }

      if (cancelled) return;

      setHost(hostRow);
      setPodcasts(pods);
      setTotalEpisodes(total);
      setSort('latest');
      setFlat({
        latest: { items: latestItems, hasMore: latestItems.length === PAGE_SIZE, loading: false },
        top: { items: [], hasMore: true, loading: false },
      });
      setLoading(false);

      if (user) {
        const { data: followData } = await supabase
          .from('host_follows')
          .select('host_id')
          .eq('user_id', user.id)
          .eq('host_id', hostRow.id)
          .maybeSingle();
        if (!cancelled) setIsFollowing(!!followData);
      }
    };

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [slug, user]);

  const loadFlat = useCallback(
    async (key: FlatTab) => {
      const state = flat[key];
      if (state.loading || !state.hasMore) return;
      setFlat((prev) => ({ ...prev, [key]: { ...prev[key], loading: true } }));

      const order = key === 'top' ? 'plays_count' : 'published_at';
      const offset = state.items.length;
      const { data } = await supabase
        .from('episodes')
        .select('*')
        .in('podcast_id', podIds)
        .order(order, { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

      const rows = ((data || []) as Episode[]).map((e) => ({ ...e, podcast: podMap.get(e.podcast_id) }));
      setFlat((prev) => ({
        ...prev,
        [key]: {
          items: [...prev[key].items, ...rows],
          hasMore: rows.length === PAGE_SIZE,
          loading: false,
        },
      }));
    },
    [flat, podIds, podMap]
  );

  // Load absolutely every episode of this host, including 4-hour ones.
  // No duration or count filtering is applied here.
  const loadAll = useCallback(async () => {
    if (loadingAll) return;
    const state = flat[sort];
    if (state.loading || !state.hasMore) return;
    setLoadingAll(true);

    const order = sort === 'top' ? 'plays_count' : 'published_at';
    let items = [...state.items];
    let offset = items.length;

    try {
      while (true) {
        const { data, error } = await supabase
          .from('episodes')
          .select('*')
          .in('podcast_id', podIds)
          .order(order, { ascending: false })
          .range(offset, offset + BULK_PAGE_SIZE - 1);

        if (error || !data || data.length === 0) break;
        items = items.concat(data.map((e) => ({ ...e, podcast: podMap.get(e.podcast_id) })));
        offset += data.length;
        if (data.length < BULK_PAGE_SIZE) break;
      }
      setFlat((prev) => ({ ...prev, [sort]: { items, hasMore: false, loading: false } }));
    } finally {
      setLoadingAll(false);
    }
  }, [flat, sort, loadingAll, podIds, podMap]);

  const changeSort = (next: FlatTab) => {
    if (next === sort) return;
    setSort(next);
    if (flat[next].items.length === 0 && !flat[next].loading && flat[next].hasMore) {
      loadFlat(next);
    }
  };

  const toggleFollow = useCallback(async () => {
    if (!user || !host || followBusy) return;
    setFollowBusy(true);
    const next = !isFollowing;
    setIsFollowing(next);
    setHost((h) => h ? { ...h, followers_count: h.followers_count + (next ? 1 : -1) } : h);

    if (next) {
      const { error } = await supabase.from('host_follows').insert({ host_id: host.id });
      if (error) {
        setIsFollowing(!next);
        setHost((h) => h ? { ...h, followers_count: h.followers_count + (next ? -1 : 1) } : h);
      }
    } else {
      await supabase.from('host_follows').delete().eq('user_id', user.id).eq('host_id', host.id);
    }
    setFollowBusy(false);
  }, [user, host, isFollowing, followBusy]);

  const totalPlays = podcasts.reduce((sum, p) => sum + (p.plays_count || 0), 0);
  const currentList = flat[sort];

  const handlePlayAll = () => {
    const queue = currentList.items;
    if (queue.length === 0) return;
    if (currentEpisode && queue.some((e) => e.id === currentEpisode.id)) {
      togglePlay();
    } else {
      playEpisode(queue[0], queue[0].podcast || podcasts[0], queue);
    }
  };

  const handlePlayEpisode = (ep: EpisodeWithPod, queue: EpisodeWithPod[]) => {
    if (currentEpisode?.id === ep.id) {
      togglePlay();
    } else {
      playEpisode(ep, ep.podcast || podcasts[0], queue);
    }
  };

  if (loading) {
    return (
      <Layout title="المقدم">
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 rounded-full border-4 border-primary-600 border-t-transparent animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!host) {
    return (
      <Layout title="المقدم">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-neutral-500 dark:text-neutral-400 font-semibold mb-4">لم يتم العثور على هذا المقدم</p>
          <Link to="/hosts">
            <Button variant="primary" size="md" rightIcon={<ArrowRight size={18} />}>
              العودة للمقدمين
            </Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const name = host.name_ar;
  const title = host.title_ar ? `${host.title_ar} ${name}` : name;
  const hostProgress = getHostProgress(host.id, totalEpisodes);

  return (
    <Layout title="المقدم">
      <button
        onClick={() => navigate('/hosts')}
        className="flex items-center gap-1 text-sm font-semibold text-neutral-500 hover:text-primary-600 dark:text-neutral-400 dark:hover:text-primary-400 transition-all mb-4"
      >
        <ArrowRight size={18} />
        عودة للمقدمين
      </button>

      {/* Hero */}
      <div className="card-base overflow-hidden mb-6 animate-fade-in-up">
        <div className="relative h-36 lg:h-48">
          {host.cover_url ? (
            <img src={host.cover_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary-600 to-primary-800" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        </div>

        <div className="px-5 lg:px-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 pt-3">
            <div className="relative flex-shrink-0 -mt-20 sm:-mt-24">
              <div className="w-24 h-24 lg:w-28 lg:h-28 rounded-full p-1 bg-white dark:bg-neutral-900">
                <div className="w-full h-full rounded-full overflow-hidden bg-neutral-200 dark:bg-neutral-800">
                  {host.photo_url ? (
                    <img src={host.photo_url} alt={name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl font-extrabold text-primary-600">
                      {name.charAt(0)}
                    </div>
                  )}
                </div>
              </div>
              {host.is_verified && (
                <span className="absolute bottom-1 left-1 w-7 h-7 rounded-full bg-primary-600 text-white flex items-center justify-center border-2 border-white dark:border-neutral-900">
                  <BadgeCheck size={15} />
                </span>
              )}
            </div>

            <div className="flex-1 pb-1">
              <h1 className="text-xl lg:text-2xl font-extrabold text-neutral-900 dark:text-white flex items-center gap-2 flex-wrap">
                {title}
                {host.is_verified && <BadgeCheck size={20} className="text-primary-600 flex-shrink-0" />}
              </h1>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                {[host.specialty_ar, host.country].filter(Boolean).join(' • ')}
              </p>
            </div>

            <div className="flex items-center gap-2 pb-1">
              <button
                onClick={toggleFollow}
                disabled={!user || followBusy}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-95 disabled:opacity-60 ${
                  isFollowing
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800'
                    : 'bg-primary-600 text-white hover:bg-primary-700'
                }`}
              >
                {isFollowing ? <UserCheck size={17} /> : <UserPlus size={17} />}
                {isFollowing ? 'متابَع' : 'متابعة'}
              </button>
              <button
                onClick={handlePlayAll}
                disabled={currentList.items.length === 0}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm bg-accent-500 text-white hover:bg-accent-600 transition-all active:scale-95 disabled:opacity-60"
              >
                {currentEpisode && currentList.items.some((e) => e.id === currentEpisode.id) && isPlaying
                  ? <Pause size={17} fill="currentColor" />
                  : <Play size={17} fill="currentColor" />}
                تشغيل الكل
              </button>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-2 mt-5">
            {[
              { icon: Users, value: formatCount(host.followers_count), label: 'متابع' },
              { icon: Mic, value: podcasts.length.toString(), label: 'بودكاست' },
              { icon: Headphones, value: totalEpisodes.toString(), label: 'حلقة' },
              { icon: Play, value: formatCount(totalPlays), label: 'تشغيل' },
            ].map((s, i) => (
              <div key={i} className="flex flex-col items-center py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60">
                <s.icon size={16} className="text-primary-600 dark:text-primary-400 mb-1" />
                <span className="text-sm font-extrabold text-neutral-900 dark:text-white">{s.value}</span>
                <span className="text-[10px] text-neutral-500 dark:text-neutral-400">{s.label}</span>
              </div>
            ))}
          </div>

          {/* Social links */}
          {host.social_links && Object.keys(host.social_links).length > 0 && (
            <div className="flex items-center gap-2 mt-4 flex-wrap">
              {Object.entries(host.social_links)
                .filter(([, url]) => !!url)
                .map(([key, url]) => {
                  const Icon = socialIcons[key] || Globe;
                  return (
                    <a
                      key={key}
                      href={url as string}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-900/30 dark:hover:text-primary-400 transition-all"
                    >
                      <Icon size={14} />
                      {socialLabels[key] || key}
                    </a>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* About */}
      {host.bio_ar && (
        <div className="card-base p-5 mb-6 animate-fade-in-up">
          <h2 className="font-extrabold text-neutral-900 dark:text-white mb-2">نبذة عن {title}</h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">{host.bio_ar}</p>
        </div>
      )}

      {/* Listening progress for this host */}
      <div className="card-base p-5 mb-6 animate-fade-in-up">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
          <div>
            <h2 className="font-extrabold text-neutral-900 dark:text-white">تقدّمك مع {name}</h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              من حلقات هذا المقدم — بيتحدّث تلقائياً كل ما تسمع.
            </p>
          </div>
          <p className="text-2xl font-extrabold text-primary-600 dark:text-primary-400">{hostProgress.percent}%</p>
        </div>
        <ProgressBar value={hostProgress.percent} size="md" variant="success" />
        <div className="flex flex-wrap gap-4 mt-3 text-xs text-neutral-500 dark:text-neutral-400">
          <span>{hostProgress.completedEpisodes} حلقة مكتملة من {hostProgress.totalEpisodes.toLocaleString('ar-EG')}</span>
          <span>{hostProgress.startedEpisodes} حلقة بدأتها</span>
          <span>تقدّم الاستماع: {hostProgress.listenPercent}%</span>
        </div>
      </div>

      {/* ---------- Part 1: summaries of every course ---------- */}
      <section id="summaries" className="mb-8 animate-fade-in-up">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg lg:text-xl font-extrabold text-neutral-900 dark:text-white">الموجزات</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              لمحة سريعة عن كل دورة من دورات {name}، من الوصف الأصلي للبودكاست.
            </p>
          </div>
          <Badge variant="neutral" size="sm">{podcasts.length} ملخص</Badge>
        </div>

        {podcasts.length === 0 ? (
          <EmptyState text="لا توجد موجزات لهذا المقدم بعد" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {podcasts.map((p) => (
              <SummaryCard key={p.id} podcast={p} />
            ))}
          </div>
        )}
      </section>

      {/* ---------- Part 2: every course and every full episode ---------- */}
      <section id="full-content" className="mb-8 animate-fade-in-up">
        <div className="mb-4">
          <h2 className="text-lg lg:text-xl font-extrabold text-neutral-900 dark:text-white">المحتوى الكامل</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            كل الدورات وكل الحلقات كاملة — من غير حذف ولا اختصار، مهما كانت مدة الحلقة (حتى لو ٤ ساعات).
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="font-extrabold text-neutral-800 dark:text-neutral-200">كل الدورات ({podcasts.length})</h3>
        </div>
        {podcasts.length === 0 ? (
          <EmptyState text="لا توجد دورات لهذا المقدم بعد" />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {podcasts.map((p) => (
              <PodcastCard key={p.id} podcast={p} />
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 mt-8 mb-3">
          <h3 className="font-extrabold text-neutral-800 dark:text-neutral-200">
            كل الحلقات ({totalEpisodes.toLocaleString('ar-EG')})
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => changeSort('latest')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                sort === 'latest'
                  ? 'bg-primary-600 text-white'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-primary-50 dark:hover:bg-primary-900/30'
              }`}
            >
              الأحدث
            </button>
            <button
              onClick={() => changeSort('top')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                sort === 'top'
                  ? 'bg-primary-600 text-white'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-primary-50 dark:hover:bg-primary-900/30'
              }`}
            >
              الأكثر استماعاً
            </button>
          </div>
        </div>

        <FlatEpisodeList
          state={currentList}
          onLoadMore={() => loadFlat(sort)}
          onLoadAll={loadAll}
          loadingAll={loadingAll}
          totalCount={totalEpisodes}
          onPlay={handlePlayEpisode}
          currentEpisodeId={currentEpisode?.id}
          isPlaying={isPlaying}
          showPlays={sort === 'top'}
        />
      </section>
    </Layout>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 mb-3">
        <Mic size={28} />
      </div>
      <p className="text-neutral-500 dark:text-neutral-400 font-semibold">{text}</p>
    </div>
  );
}

function SummaryCard({ podcast }: { podcast: PodcastWithCount }) {
  const [expanded, setExpanded] = useState(false);
  const full = stripHtml(podcast.description || '');
  const short = full.length > 240 ? `${full.slice(0, 239).trimEnd()}…` : full;

  return (
    <div className="card-base p-4 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        {podcast.cover_url && (
          <img src={podcast.cover_url} alt="" loading="lazy" decoding="async" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <Link
            to={`/podcasts/${podcast.id}`}
            className="block font-extrabold text-sm text-neutral-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 line-clamp-2"
          >
            {podcast.title}
          </Link>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            {podcast.episodes_count ?? 0} حلقة
          </p>
        </div>
      </div>

      <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
        {full ? (expanded ? full : short) : 'لا يوجد وصف متاح لهذه الدورة.'}
      </p>

      <div className="mt-auto flex items-center justify-between gap-2 pt-1">
        {full.length > 240 ? (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline"
          >
            {expanded ? 'تصغير' : 'المزيد'}
          </button>
        ) : (
          <span />
        )}
        <Link
          to={`/podcasts/${podcast.id}`}
          className="text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
        >
          افتح الدورة <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  );
}

function FlatEpisodeList({
  state,
  onLoadMore,
  onLoadAll,
  loadingAll = false,
  totalCount,
  onPlay,
  currentEpisodeId,
  isPlaying,
  showPlays = false,
}: {
  state: ListState;
  onLoadMore: () => void;
  onLoadAll?: () => void;
  loadingAll?: boolean;
  totalCount?: number;
  onPlay: (ep: EpisodeWithPod, queue: EpisodeWithPod[]) => void;
  currentEpisodeId?: string;
  isPlaying: boolean;
  showPlays?: boolean;
}) {
  if (state.items.length === 0) {
    return state.loading ? (
      <div className="flex items-center justify-center py-16">
        <div className="w-9 h-9 rounded-full border-4 border-primary-600 border-t-transparent animate-spin" />
      </div>
    ) : (
      <EmptyState text="لا توجد حلقات بعد" />
    );
  }

  return (
    <div>
      <div className="space-y-2">
        {state.items.map((ep) => (
          <EpisodeRow
            key={ep.id}
            ep={ep}
            onPlay={() => onPlay(ep, state.items)}
            isCurrent={currentEpisodeId === ep.id}
            isPlaying={isPlaying}
            showPlays={showPlays}
          />
        ))}
      </div>
      {state.hasMore && (
        <div className="mt-3 flex flex-col sm:flex-row gap-2">
          <button
            onClick={onLoadMore}
            disabled={state.loading || loadingAll}
            className="flex-1 py-3 rounded-xl text-sm font-bold bg-neutral-100 dark:bg-neutral-800 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 disabled:opacity-60 transition-all"
          >
            {state.loading ? 'جارٍ التحميل…' : `عرض المزيد (${state.items.length} من ${totalCount ?? '…'})`}
          </button>
          {onLoadAll && (
            <button
              onClick={onLoadAll}
              disabled={state.loading || loadingAll}
              className="flex-1 py-3 rounded-xl text-sm font-bold bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-60 transition-all"
            >
              {loadingAll ? 'جارٍ عرض كل الحلقات…' : `عرض كل الحلقات (${totalCount ?? ''})`}
            </button>
          )}
        </div>
      )}
      {!state.hasMore && state.items.length > 0 && (
        <p className="text-center text-xs text-neutral-400 mt-3">
          تم عرض كل الحلقات ({state.items.length.toLocaleString('ar-EG')}) — كاملة.
        </p>
      )}
    </div>
  );
}

function EpisodeRow({
  ep,
  onPlay,
  isCurrent,
  isPlaying,
  showPlays = false,
}: {
  ep: Episode & { podcast?: Podcast };
  onPlay: (ep: Episode & { podcast?: Podcast }) => void;
  isCurrent: boolean;
  isPlaying: boolean;
  showPlays?: boolean;
}) {
  return (
    <div className={`card-base p-4 flex items-center gap-4 transition-all ${isCurrent ? 'ring-2 ring-primary-500' : ''}`}>
      <button
        onClick={() => onPlay(ep)}
        disabled={!ep.audio_url}
        className={`flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed ${
          isCurrent
            ? 'bg-primary-600 text-white'
            : 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 hover:bg-primary-600 hover:text-white'
        }`}
      >
        {isCurrent && isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="mr-0.5" />}
      </button>
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-100 truncate">{ep.title}</h3>
        {ep.podcast && (
          <Link to={`/podcasts/${ep.podcast.id}`} className="text-xs text-primary-600 dark:text-primary-400 hover:underline truncate">
            {ep.podcast.title}
          </Link>
        )}
        <div className="flex items-center gap-3 mt-0.5">
          {ep.duration_seconds > 0 && (
            <span className="text-xs text-neutral-400">{formatDuration(ep.duration_seconds)}</span>
          )}
          <span className="text-xs text-neutral-400">{formatRelativeTime(ep.published_at)}</span>
          {showPlays && ep.plays_count > 0 && (
            <span className="flex items-center gap-1 text-xs text-neutral-400">
              <Headphones size={11} />
              {formatCount(ep.plays_count)}
            </span>
          )}
        </div>
      </div>
      <DownloadButton episode={ep} podcast={ep.podcast} compact />
      {ep.podcast?.category && (
        <Badge variant="neutral" size="sm" className="hidden sm:inline-flex flex-shrink-0">
          {ep.podcast.category.name_ar}
        </Badge>
      )}
    </div>
  );
}
