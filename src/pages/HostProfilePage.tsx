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
  BookOpen,
  ExternalLink,
  Send,
  UserPlus,
  UserCheck,
} from 'lucide-react';
import { Layout } from '@/components/layout';
import { Button, Badge, ProgressBar } from '@/components/ui';
import { PodcastCard } from '@/components/PodcastCard';
import { DownloadButton } from '@/components/DownloadButton';
import { OptimizedImage } from '@/components/OptimizedImage';
import { hostPhotoUrl } from '@/lib/hostPhotos';
import { podcastCoverUrl } from '@/lib/podcastArtwork';
import { byLatest, byPlays, bySeries } from '@/lib/episodeOrder';
import {
  AHMED_ARABI_COURSES,
  AHMED_ARABI_EPISODE_IDS,
  AHMED_ARABI_HOST,
  AHMED_ARABI_SLUG,
  AHMED_ARABI_SOLO_TITLE,
  ahmedCourseForEpisode,
  type AhmedCourse,
} from '@/lib/ahmedArabi';
import {
  BASEL_MOUNES_COURSES,
  BASEL_MOUNES_EPISODES,
  BASEL_MOUNES_HOST,
  BASEL_MOUNES_QURAN_EPISODES,
  BASEL_MOUNES_QURAN_PODCAST,
  BASEL_MOUNES_QURAN_RECITATIONS,
  BASEL_MOUNES_QURAN_SOURCE_URL,
  BASEL_MOUNES_SLUG,
  BASEL_MOUNES_SOLO_TITLE,
  baselCourseForEpisode,
  type BaselCourse,
} from '@/lib/baselMounes';
import {
  EBRAHIM_HEGAZY_EPISODES,
  EBRAHIM_HEGAZY_HOST,
  EBRAHIM_HEGAZY_PROGRAMS,
  EBRAHIM_HEGAZY_SLUG,
  EBRAHIM_HEGAZY_SOURCES,
  hegazyProgramForEpisode,
  type HegazyProgram,
} from '@/lib/ebrahimHegazy';
import { useAuth } from '@/context/AuthContext';
import { useAudioPlayer } from '@/context/AudioPlayerContext';
import { useProgress } from '@/context/ProgressContext';
import { supabase } from '@/lib/supabase';
import {
  AHMED_QURAN_EPISODES,
  AHMED_QURAN_EXTRA_SOURCE_URL,
  AHMED_QURAN_PODCAST,
  AHMED_QURAN_RECITATIONS,
  AHMED_QURAN_SOURCE_URL,
} from '@/lib/ahmedArabiQuran';
import type { Host, Podcast, Episode } from '@/types/podcast';
import { formatCount, formatDuration, formatRelativeTime } from '@/types/podcast';

type FlatTab = 'latest' | 'top' | 'series';
type EpisodeWithPod = Episode & { podcast?: Podcast; courseTitle?: string };
type PodcastWithCount = Podcast & { episodes_count?: number };
type PresenterCourse = AhmedCourse | BaselCourse | HegazyProgram;

interface ListState {
  items: EpisodeWithPod[];
  hasMore: boolean;
  loading: boolean;
}

const PAGE_SIZE = 30;
const BULK_PAGE_SIZE = 500;

// The corrected slug lands in the database with the hosted SQL migration.
// Until it is run, keep the old link working instead of showing a dead page.
const SLUG_ALIASES: Record<string, string> = {
  'saja-aljulaud': 'ibrahim-hegazy',
};

const socialIcons: Record<string, typeof Youtube> = {
  youtube: Youtube,
  twitter: Twitter,
  instagram: Instagram,
  website: Globe,
  telegram: Send,
  quran: BookOpen,
};

const socialLabels: Record<string, string> = {
  youtube: 'يوتيوب',
  twitter: 'تويتر',
  instagram: 'إنستغرام',
  website: 'الموقع',
  telegram: 'تليجرام',
  facebook: 'فيسبوك',
  quran: 'التلاوات',
  linkedin: 'لينكدإن',
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
    series: { items: [], hasMore: true, loading: false },
  });

  const hostIsAhmed = host?.slug === AHMED_ARABI_SLUG;
  const hostIsBasel = host?.slug === BASEL_MOUNES_SLUG;
  const hostIsHegazy = host?.slug === EBRAHIM_HEGAZY_SLUG;
  // He has no Quran recitation: only real interviews where he is the guest.
  const hostIsQuran = hostIsAhmed || hostIsBasel;
  const hostIsCurated = hostIsQuran || hostIsHegazy;
  const presenterCourses: PresenterCourse[] = hostIsHegazy
    ? EBRAHIM_HEGAZY_PROGRAMS
    : hostIsBasel
      ? BASEL_MOUNES_COURSES
      : AHMED_ARABI_COURSES;
  const presenterSoloTitle = hostIsHegazy
    ? ''
    : hostIsBasel ? BASEL_MOUNES_SOLO_TITLE : AHMED_ARABI_SOLO_TITLE;
  const courseWords = hostIsHegazy
    ? { one: 'برنامج', many: 'البرامج', empty: 'برامج' }
    : { one: 'دورة', many: 'الدورات', empty: 'دورات' };
  const quranEpisodes = hostIsBasel ? BASEL_MOUNES_QURAN_EPISODES : AHMED_QURAN_EPISODES;
  const quranPodcast = hostIsBasel ? BASEL_MOUNES_QURAN_PODCAST : AHMED_QURAN_PODCAST;
  const quranSourceUrl = hostIsBasel ? BASEL_MOUNES_QURAN_SOURCE_URL : AHMED_QURAN_SOURCE_URL;
  const quranSourceLabel = hostIsBasel ? 'Internet Archive' : 'الطريق إلى القرآن';
  const quranExtraSourceUrl = hostIsBasel ? undefined : AHMED_QURAN_EXTRA_SOURCE_URL;
  const quranExtraSourceLabel = hostIsBasel ? undefined : 'موجز تلاواته';
  const quranEditionLabel = hostIsBasel ? 'مصحف مرتل' : 'حفص عن عاصم';
  const quranRecitations = hostIsBasel
    ? BASEL_MOUNES_QURAN_RECITATIONS
    : AHMED_QURAN_RECITATIONS;
  const quranCompletion =
    quranRecitations.length === 114
      ? ' — المصحف كامل بصوتهم.'
      : '؛ لم يكتمل المصحف بصوتهم، ولا كُمل بفجوات من قارئ آخر.';
  const quranNote = hostIsBasel
    ? `التلاوات المتاحة بصوت م. باسل مؤنس — منفصلة عن دروسه، وغير داخل عدّاد الحلقات. ${quranRecitations.length} من ١١٤ سورة، منها مقاطع جزئية موثّقة بصوته${quranCompletion}`
    : `التلاوات المتاحة بصوت د. أحمد العربي — منفصلة عن حلقات فاهم وبدون ورق، وغير داخل عدّاد الحلقات. ${quranRecitations.length} من ١١٤ سورة، منها تسجيلات تراويح منشورة باسمه ومقاطع «ما تيسر» بآياتها في العناوين${quranCompletion}`;
  const reciterName = hostIsBasel ? 'م. باسل مؤنس' : 'د. أحمد العربي';
  const podMap = useMemo(() => new Map(podcasts.map((p) => [p.id, p])), [podcasts]);
  const podIds = useMemo(() => podcasts.map((p) => p.id), [podcasts]);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      setHost(null);

      const resolvedSlug = SLUG_ALIASES[slug || ''] || slug;
      const { data: hostData } = await supabase
        .from('hosts')
        .select('*, category:categories(*)')
        .eq('slug', resolvedSlug)
        .maybeSingle();

      // Curated presenters must stay usable before/without database rows:
      // Ahmed's series live inside other shows, Basel's audio is on public
      // archives, and Hegazy's verified interviews are on third-party feeds.
      const fallbackHost =
        resolvedSlug === AHMED_ARABI_SLUG
          ? AHMED_ARABI_HOST
          : resolvedSlug === BASEL_MOUNES_SLUG
            ? BASEL_MOUNES_HOST
            : resolvedSlug === EBRAHIM_HEGAZY_SLUG
              ? EBRAHIM_HEGAZY_HOST
              : null;
      const hostRow = (hostData as Host | null) || fallbackHost;
      const hasDatabaseHost = !!hostData;
      if (!hostRow) {
        if (!cancelled) setLoading(false);
        return;
      }
      const isAhmed = hostRow.slug === AHMED_ARABI_SLUG;
      const isBasel = hostRow.slug === BASEL_MOUNES_SLUG;
      const isHegazy = hostRow.slug === EBRAHIM_HEGAZY_SLUG;
      const isCurated = isAhmed || isBasel || isHegazy;
      // The curated list works before the SQL migration is applied. Once the
      // episode_credits table exists, it becomes the source of truth and can
      // include future verified appearances without another app release.
      let ahmedIds = AHMED_ARABI_EPISODE_IDS;

      let pods: PodcastWithCount[] = [];
      let total = 0;
      let map = new Map<string, PodcastWithCount>();
      let ids: string[] = [];

      if (isAhmed && hasDatabaseHost) {
        const { data: creditData } = await supabase
          .from('episode_credits')
          .select('episode_id')
          .eq('host_id', hostRow.id);
        const creditedIds = (creditData || [])
          .map((row) => row.episode_id)
          .filter((id): id is string => !!id);
        if (creditedIds.length > 0) {
          ahmedIds = [
            ...AHMED_ARABI_EPISODE_IDS.filter((id) => creditedIds.includes(id)),
            ...creditedIds.filter((id) => !AHMED_ARABI_EPISODE_IDS.includes(id)),
          ];
        }
      }

      if (!isCurated) {
        // Every podcast of this host, each with its real episode count.
        const { data: podData } = await supabase
          .from('podcasts')
          .select('id,title,cover_url,type,audience_level,host_name,created_at,category_id,host_id,category:categories(name_ar),episodes(count)')
          .eq('host_id', hostRow.id)
          .order('created_at', { ascending: false })
          .range(0, 999);

        pods = ((podData || []) as unknown as (PodcastWithCount & { episodes?: { count: number }[] })[]).map(
          ({ episodes: counted, ...rest }) => ({ ...rest, episodes_count: counted?.[0]?.count ?? 0 })
        );
        // Largest courses first makes both the summaries and the course grid
        // predictable instead of following import timestamps.
        pods.sort((a, b) => (b.episodes_count || 0) - (a.episodes_count || 0) || a.title.localeCompare(b.title, 'ar'));
        map = new Map(pods.map((p) => [p.id, p]));
        ids = pods.map((p) => p.id);
        total = pods.reduce((sum, p) => sum + (p.episodes_count || 0), 0);
      } else {
        total = isAhmed
          ? ahmedIds.length
          : isBasel
            ? BASEL_MOUNES_EPISODES.length
            : EBRAHIM_HEGAZY_EPISODES.length;
      }

      if (cancelled) return;

      // Show the host profile as soon as its own data is ready. The episode
      // feed and follow state are background work and must not block the page.
      setHost(hostRow);
      setPodcasts(pods);
      setTotalEpisodes(total);
      // Start with the arranged view: every course grouped, and its episodes
      // numbered from ١. "الأحدث" stays available as an explicit alternative.
      setSort('series');
      setFlat({
        latest: { items: [], hasMore: true, loading: false },
        top: { items: [], hasMore: true, loading: false },
        series: { items: [], hasMore: true, loading: true },
      });
      setLoading(false);

      void (async () => {
        let firstItems: EpisodeWithPod[] = [];
        if (isAhmed) {
          // Gather only the rows verified to name him; the source show stays
          // attached to each row so فاهم keeps its own presenter.
          const { data: epData } = await supabase
            .from('episodes')
            .select('*, podcasts(id,title,cover_url,category_id,host_name,host_id,category:categories(name_ar))')
            .in('id', ahmedIds);
          firstItems = ((epData || []) as unknown as Array<Episode & { podcasts?: Podcast }>).map((ep) => ({
            ...ep,
            podcast: ep.podcasts,
            courseTitle: ahmedCourseForEpisode(ep.id),
          }));
          firstItems.sort((a, b) => ahmedIds.indexOf(a.id) - ahmedIds.indexOf(b.id));
        } else if (isBasel) {
          // Every distinct, source-labelled talk; exact archive duplicates and
          // files about other presenters are left out of the curated module.
          firstItems = BASEL_MOUNES_EPISODES.map((ep) => ({
            ...ep,
            courseTitle: baselCourseForEpisode(ep.id),
          }));
        } else if (isHegazy) {
          // Real interviews where he is the named guest. Each row keeps the
          // original show so no other presenter's programme is relabelled.
          firstItems = EBRAHIM_HEGAZY_EPISODES.map((ep) => ({
            ...ep,
            courseTitle: hegazyProgramForEpisode(ep.id),
          }));
        } else if (ids.length > 0) {
          const { data: epData } = await supabase
            .from('episodes')
            .select('*')
            .in('podcast_id', ids)
            .order('title', { ascending: true })
            .range(0, PAGE_SIZE - 1);
          firstItems = ((epData || []) as Episode[]).map((e) => ({ ...e, podcast: map.get(e.podcast_id) }));
        }
        if (cancelled) return;
        setFlat({
          latest: isCurated
            ? { items: [...firstItems].sort(byLatest), hasMore: false, loading: false }
            : { items: [], hasMore: true, loading: false },
          top: isCurated
            ? { items: [...firstItems].sort(byPlays), hasMore: false, loading: false }
            : { items: [], hasMore: true, loading: false },
          series: { items: firstItems, hasMore: !isCurated && firstItems.length === PAGE_SIZE, loading: false },
        });

        if (user) {
          const { data: followData } = await supabase
            .from('host_follows')
            .select('host_id')
            .eq('user_id', user.id)
            .eq('host_id', hostRow.id)
            .maybeSingle();
          if (!cancelled) setIsFollowing(!!followData);
        }
      })();
    };

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [slug, user]);

  const loadFlat = useCallback(
    async (key: FlatTab) => {
      const state = flat[key];
      if (podIds.length === 0 || state.loading || !state.hasMore) return;
      setFlat((prev) => ({ ...prev, [key]: { ...prev[key], loading: true } }));

      const order = key === 'top' ? 'plays_count' : key === 'series' ? 'title' : 'published_at';
      const offset = state.items.length;
      const { data } = await supabase
        .from('episodes')
        .select('*')
        .in('podcast_id', podIds)
        .order(order, { ascending: key === 'series' })
        .range(offset, offset + PAGE_SIZE - 1);

      const rows = ((data || []) as Episode[]).map((e) => ({ ...e, podcast: podMap.get(e.podcast_id) }));
      setFlat((prev) => {
        const items = [...prev[key].items, ...rows];
        return {
          ...prev,
          [key]: {
            items: key === 'series' ? items.sort(bySeries) : items,
            hasMore: rows.length === PAGE_SIZE,
            loading: false,
          },
        };
      });
    },
    [flat, podIds, podMap]
  );

  // Load absolutely every episode of this host, including 4-hour ones.
  // No duration or count filtering is applied here.
  const loadAllFor = useCallback(async (key: FlatTab = sort) => {
    if (loadingAll || podIds.length === 0) return;
    const state = flat[key];
    if (state.loading || !state.hasMore) return;
    setLoadingAll(true);

    const order = key === 'top' ? 'plays_count' : key === 'series' ? 'title' : 'published_at';
    let items = [...state.items];
    let offset = items.length;

    try {
      while (true) {
        const { data, error } = await supabase
          .from('episodes')
          .select('*')
          .in('podcast_id', podIds)
          .order(order, { ascending: key === 'series' })
          .range(offset, offset + BULK_PAGE_SIZE - 1);

        if (error || !data || data.length === 0) break;
        items = items.concat(data.map((e) => ({ ...e, podcast: podMap.get(e.podcast_id) })));
        offset += data.length;
        if (data.length < BULK_PAGE_SIZE) break;
      }
      if (key === 'series') items.sort(bySeries);
      setFlat((prev) => ({ ...prev, [key]: { items, hasMore: false, loading: false } }));
    } finally {
      setLoadingAll(false);
    }
  }, [flat, sort, loadingAll, podIds, podMap]);

  const loadAll = useCallback(() => loadAllFor(sort), [loadAllFor, sort]);

  const changeSort = (next: FlatTab) => {
    if (next === sort) return;
    setSort(next);
    if (flat[next].items.length === 0 && !flat[next].loading && flat[next].hasMore) {
      // Grouped view needs the whole catalogue to organise it by course.
      if (next === 'series') void loadAllFor('series');
      else loadFlat(next);
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

  const courses = hostIsCurated ? presenterCourses : [];
  const totalPlays = hostIsCurated
    ? flat.series.items.reduce((sum, ep) => sum + (ep.plays_count || 0), 0)
    : podcasts.reduce((sum, p) => sum + (p.plays_count || 0), 0);
  const currentList = flat[sort];
  const displayItems = useMemo(
    () => (sort === 'series' && !hostIsCurated ? [...currentList.items].sort(bySeries) : currentList.items),
    [sort, hostIsCurated, currentList.items]
  );
  const displayList = useMemo(
    () => ({ ...currentList, items: displayItems }),
    [currentList, displayItems]
  );

  const handlePlayAll = () => {
    const queue = displayItems;
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

  const handlePlayQuran = () => {
    if (quranEpisodes.some((episode) => episode.id === currentEpisode?.id)) {
      togglePlay();
    } else {
      playEpisode(quranEpisodes[0], quranPodcast, quranEpisodes);
    }
  };

  const handlePlayQuranEpisode = (episode: Episode) => {
    if (currentEpisode?.id === episode.id) {
      togglePlay();
    } else {
      playEpisode(episode, quranPodcast, quranEpisodes);
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
  const photoUrl = hostPhotoUrl(host);
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
            <OptimizedImage src={host.cover_url} alt="" width={1200} aspect="wide" priority className="w-full h-full object-cover" />
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
                  {photoUrl ? (
                    <OptimizedImage src={photoUrl} alt={name} width={224} priority className="w-full h-full object-cover" />
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
          <div className={`grid gap-2 mt-5 ${hostIsQuran ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5' : hostIsCurated ? 'grid-cols-3' : 'grid-cols-4'}`}>
            {[
              { icon: Users, value: formatCount(host.followers_count), label: 'متابع' },
              { icon: Mic, value: (hostIsCurated ? courses.length : podcasts.length).toString(), label: hostIsCurated ? courseWords.many : 'بودكاست' },
              { icon: Headphones, value: totalEpisodes.toString(), label: 'حلقة' },
              ...(hostIsQuran
                ? [{ icon: BookOpen, value: quranEpisodes.length.toLocaleString('ar-EG'), label: 'تلاوة' }]
                : []),
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

      {hostIsHegazy && (
        <div className="card-base p-5 mb-6 animate-fade-in-up">
          <h2 className="font-extrabold text-neutral-900 dark:text-white mb-2">لقاءات بصوته في برامج أخرى</h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
            إبراهيم حجازي ضيف في هذه الحلقات، وليس مقدّمها. كل حلقة كاملة ومنسوبة لبرنامجها الأصلي؛ لا تلاوات قرآنية له في سدى.
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            {EBRAHIM_HEGAZY_SOURCES.map((source) => (
              <a
                key={source.url}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-900/30 dark:hover:text-primary-400 transition-all"
              >
                <ExternalLink size={14} />
                {source.label}
              </a>
            ))}
          </div>
        </div>
      )}

      {hostIsQuran && (
        <QuranRecitationsSection
          episodes={quranEpisodes}
          recitations={quranRecitations}
          reciterName={reciterName}
          note={quranNote}
          sourceUrl={quranSourceUrl}
          sourceLabel={quranSourceLabel}
          extraSourceUrl={quranExtraSourceUrl}
          extraSourceLabel={quranExtraSourceLabel}
          editionLabel={quranEditionLabel}
          currentEpisodeId={currentEpisode?.id}
          isPlaying={isPlaying}
          onPlayAll={handlePlayQuran}
          onPlay={handlePlayQuranEpisode}
        />
      )}

      {/* ---------- Part 1: summaries of every course ---------- */}
      <section id="summaries" className="mb-8 animate-fade-in-up">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg lg:text-xl font-extrabold text-neutral-900 dark:text-white">الموجزات</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              {hostIsHegazy
                ? `لمحة سريعة عن كل برنامج ظهر فيه ${name}، من الوصف الأصلي للبودكاست.`
                : `لمحة سريعة عن كل دورة من دورات ${name}، من الوصف الأصلي للبودكاست.`}
            </p>
          </div>
          <Badge variant="neutral" size="sm">{(hostIsCurated ? courses : podcasts).length} ملخص</Badge>
        </div>

        {hostIsCurated ? (
          courses.length === 0 ? (
            <EmptyState text="لا توجد موجزات لهذا المقدم بعد" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses.map((course) => (
                <CuratedCourseCard
                  key={course.key}
                  course={course}
                  episodes={flat.series.items.filter((ep) => ep.courseTitle === course.title)}
                  onPlay={(episodes) => {
                    if (episodes.length > 0) playEpisode(episodes[0], episodes[0].podcast, episodes);
                  }}
                />
              ))}
            </div>
          )
        ) : podcasts.length === 0 ? (
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
            كل {courseWords.many} وكل الحلقات كاملة — من غير حذف ولا اختصار، مهما كانت مدة الحلقة (حتى لو ٤ ساعات).
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="font-extrabold text-neutral-800 dark:text-neutral-200">
            كل {courseWords.many} ({(hostIsCurated ? courses : podcasts).length})
          </h3>
        </div>
        {hostIsCurated ? (
          courses.length === 0 ? (
            <EmptyState text={`لا توجد ${courseWords.empty} لهذا المقدم بعد`} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses.map((course) => (
                <CuratedCourseCard
                  key={course.key}
                  course={course}
                  episodes={flat.series.items.filter((ep) => ep.courseTitle === course.title)}
                  onPlay={(episodes) => {
                    if (episodes.length > 0) playEpisode(episodes[0], episodes[0].podcast, episodes);
                  }}
                />
              ))}
            </div>
          )
        ) : podcasts.length === 0 ? (
          <EmptyState text={`لا توجد ${courseWords.empty} لهذا المقدم بعد`} />
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
            <button
              onClick={() => changeSort('series')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                sort === 'series'
                  ? 'bg-primary-600 text-white'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-primary-50 dark:hover:bg-primary-900/30'
              }`}
              title="حسب الدورة — الحلقة ١ أولاً"
            >
              مرتب
            </button>
          </div>
        </div>

        <FlatEpisodeList
          state={displayList}
          onLoadMore={() => loadFlat(sort)}
          onLoadAll={loadAll}
          loadingAll={loadingAll}
          totalCount={totalEpisodes}
          onPlay={handlePlayEpisode}
          currentEpisodeId={currentEpisode?.id}
          isPlaying={isPlaying}
          showPlays={sort === 'top'}
          groupByPodcast={sort === 'series'}
          groupByCourse={hostIsCurated && sort === 'series'}
          courseOrder={presenterCourses.map((course) => course.title)}
          soloTitle={presenterSoloTitle}
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

function QuranRecitationsSection({
  episodes,
  recitations,
  reciterName,
  note,
  sourceUrl,
  sourceLabel,
  extraSourceUrl,
  extraSourceLabel,
  editionLabel,
  currentEpisodeId,
  isPlaying,
  onPlayAll,
  onPlay,
}: {
  episodes: Episode[];
  recitations: Array<{ id: string; surahNumber: number }>;
  reciterName: string;
  note: string;
  sourceUrl: string;
  sourceLabel: string;
  extraSourceUrl?: string;
  extraSourceLabel?: string;
  editionLabel: string;
  currentEpisodeId?: string;
  isPlaying: boolean;
  onPlayAll: () => void;
  onPlay: (episode: Episode) => void;
}) {
  const surahNumbers = useMemo(
    () => new Map(recitations.map((item) => [item.id, item.surahNumber])),
    [recitations]
  );
  const wholeQueuePlaying = episodes.some((episode) => episode.id === currentEpisodeId) && isPlaying;

  return (
    <section id="quran" className="mb-6 animate-fade-in-up">
      <div className="card-base p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center flex-shrink-0">
              <BookOpen size={22} />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg lg:text-xl font-extrabold text-neutral-900 dark:text-white">تلاوة القرآن</h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">{note}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="neutral" size="sm">{editionLabel}</Badge>
            <button
              onClick={onPlayAll}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm bg-accent-500 text-white hover:bg-accent-600 transition-all active:scale-95"
            >
              {wholeQueuePlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
              تشغيل الكل
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
          <span>{episodes.length.toLocaleString('ar-EG')} تلاوة متاحة من المصدر</span>
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary-600 dark:text-primary-400 hover:underline"
          >
            المصدر: {sourceLabel} <ExternalLink size={12} />
          </a>
          {extraSourceUrl && extraSourceLabel && (
            <a
              href={extraSourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary-600 dark:text-primary-400 hover:underline"
            >
              ومصدر: {extraSourceLabel} <ExternalLink size={12} />
            </a>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 mt-4">
          {episodes.map((episode) => {
            const current = currentEpisodeId === episode.id;
            const number = surahNumbers.get(episode.id);
            return (
              <div
                key={episode.id}
                className={`flex items-center gap-3 rounded-xl border p-3 transition-all ${
                  current
                    ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-neutral-200 dark:border-neutral-700 bg-neutral-50/60 dark:bg-neutral-800/40'
                }`}
              >
                <span className="w-8 flex-shrink-0 text-center text-xs font-extrabold text-neutral-400">
                  {number !== undefined ? number.toLocaleString('ar-EG') : '—'}
                </span>
                <button
                  onClick={() => onPlay(episode)}
                  className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                    current
                      ? 'bg-primary-600 text-white'
                      : 'bg-white dark:bg-neutral-800 text-primary-600 dark:text-primary-400 hover:bg-primary-600 hover:text-white'
                  }`}
                  aria-label={`تشغيل ${episode.title}`}
                >
                  {current && isPlaying
                    ? <Pause size={15} fill="currentColor" />
                    : <Play size={15} fill="currentColor" className="mr-0.5" />}
                </button>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-100 truncate">{episode.title}</h3>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">تلاوة بصوت {reciterName}</p>
                </div>
                <Badge variant="neutral" size="sm" className="flex-shrink-0">صوت</Badge>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function CuratedCourseCard({
  course,
  episodes,
  onPlay,
}: {
  course: PresenterCourse;
  episodes: EpisodeWithPod[];
  onPlay: (episodes: EpisodeWithPod[]) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const short = course.description.length > 240 ? `${course.description.slice(0, 239).trimEnd()}…` : course.description;

  return (
    <div className="card-base p-4 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <OptimizedImage src={course.coverUrl} alt="" width={96} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <h3 className="font-extrabold text-sm text-neutral-900 dark:text-white line-clamp-2">{course.title}</h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{episodes.length} حلقة</p>
        </div>
      </div>

      <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
        {expanded ? course.description : short}
      </p>

      <div className="mt-auto flex items-center justify-between gap-2 pt-1">
        {course.description.length > 240 ? (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline"
          >
            {expanded ? 'تصغير' : 'المزيد'}
          </button>
        ) : (
          <span />
        )}
        <button
          onClick={() => onPlay(episodes)}
          disabled={episodes.length === 0}
          className="inline-flex items-center gap-1 text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline disabled:opacity-50"
        >
          <Play size={13} fill="currentColor" />
          شغّل الدورة
        </button>
      </div>
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
        <OptimizedImage src={podcastCoverUrl(podcast)} alt="" width={96} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
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
  groupByPodcast = false,
  groupByCourse = false,
  courseOrder = [],
  soloTitle = AHMED_ARABI_SOLO_TITLE,
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
  groupByPodcast?: boolean;
  groupByCourse?: boolean;
  courseOrder?: string[];
  soloTitle?: string;
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

  const groups = new Map<string, { id: string; title: string; items: EpisodeWithPod[] }>();
  if (groupByCourse || groupByPodcast) {
    state.items.forEach((ep) => {
      const key = groupByCourse
        ? ep.courseTitle || soloTitle
        : ep.podcast_id || 'other';
      const group = groups.get(key) || {
        id: key,
        title: groupByCourse
          ? key
          : ep.podcast?.title || 'حلقات أخرى',
        items: [],
      };
      group.items.push(ep);
      groups.set(key, group);
    });
  }
  const courseIndex = (title: string) => {
    if (!groupByCourse) return -1;
    const index = courseOrder.indexOf(title);
    return index === -1 ? courseOrder.length : index;
  };
  const orderedGroups = [...groups.values()].sort(
    (a, b) =>
      courseIndex(a.title) - courseIndex(b.title) ||
      (groupByCourse ? 0 : b.items.length - a.items.length) ||
      a.title.localeCompare(b.title, 'ar')
  );

  return (
    <div>
      {groupByPodcast || groupByCourse ? (
        <div className="space-y-7">
          {orderedGroups.map((group) => (
            <section key={group.id}>
              <div className="mb-2 flex items-center justify-between gap-2 border-b border-neutral-200 pb-2 dark:border-neutral-700">
                <h4 className="min-w-0 truncate text-sm font-extrabold text-neutral-800 dark:text-neutral-100">
                  {group.title}
                </h4>
                <span className="whitespace-nowrap rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-bold text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
                  {group.items.length} حلقة
                </span>
              </div>
              <div className="space-y-2">
                {group.items.map((ep, index) => (
                  <EpisodeRow
                    key={ep.id}
                    ep={ep}
                    number={index + 1}
                    onPlay={() => onPlay(ep, group.items)}
                    isCurrent={currentEpisodeId === ep.id}
                    isPlaying={isPlaying}
                    showPlays={showPlays}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {state.items.map((ep, index) => (
            <EpisodeRow
              key={ep.id}
              ep={ep}
              number={index + 1}
              onPlay={() => onPlay(ep, state.items)}
              isCurrent={currentEpisodeId === ep.id}
              isPlaying={isPlaying}
              showPlays={showPlays}
            />
          ))}
        </div>
      )}
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
  number,
}: {
  ep: Episode & { podcast?: Podcast };
  onPlay: (ep: Episode & { podcast?: Podcast }) => void;
  isCurrent: boolean;
  isPlaying: boolean;
  showPlays?: boolean;
  number?: number;
}) {
  return (
    <div className={`card-base p-4 flex items-center gap-4 transition-all ${isCurrent ? 'ring-2 ring-primary-500' : ''}`}>
      {number !== undefined && (
        <span className="w-6 flex-shrink-0 text-center text-xs font-extrabold text-neutral-400">
          {number.toLocaleString('ar-EG')}
        </span>
      )}
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
        {ep.podcast && (ep.podcast.id.startsWith('curated:') || ep.podcast.id.startsWith('quran:') ? (
          <span className="truncate text-xs text-neutral-500 dark:text-neutral-400">{ep.podcast.title}</span>
        ) : (
          <Link to={`/podcasts/${ep.podcast.id}`} className="text-xs text-primary-600 dark:text-primary-400 hover:underline truncate">
            {ep.podcast.title}
          </Link>
        ))}
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
