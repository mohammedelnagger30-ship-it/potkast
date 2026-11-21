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
import { Button, Badge } from '@/components/ui';
import { PodcastCard } from '@/components/PodcastCard';
import { useAuth } from '@/context/AuthContext';
import { useAudioPlayer } from '@/context/AudioPlayerContext';
import { supabase } from '@/lib/supabase';
import type { Host, Podcast, Episode } from '@/types/podcast';
import { formatCount, formatDuration, formatRelativeTime } from '@/types/podcast';

type TabId = 'podcasts' | 'all' | 'latest' | 'top';

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

export default function HostProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentEpisode, isPlaying, togglePlay, playEpisode } = useAudioPlayer();

  const [host, setHost] = useState<Host | null>(null);
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [episodes, setEpisodes] = useState<(Episode & { podcast?: Podcast })[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('podcasts');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;

    const fetchData = async () => {
      setLoading(true);

      const { data: hostData } = await supabase
        .from('hosts')
        .select('*, category:categories(*)')
        .eq('slug', slug)
        .maybeSingle();

      if (!hostData) {
        setLoading(false);
        return;
      }
      const hostRow = hostData as Host;
      setHost(hostRow);

      // Load every podcast and every episode (paged so nothing is cut off).
      const allPods: Podcast[] = [];
      for (let offset = 0; ; offset += 1000) {
        const { data } = await supabase
          .from('podcasts')
          .select('*, category:categories(*)')
          .eq('host_id', hostRow.id)
          .order('created_at', { ascending: false })
          .range(offset, offset + 999);
        const batch = (data || []) as Podcast[];
        allPods.push(...batch);
        if (batch.length < 1000) break;
      }
      const pods = allPods;
      setPodcasts(pods);

      if (pods.length > 0) {
        const podIds = pods.map((p) => p.id);
        const allEpisodes: (Episode & { podcast?: Podcast })[] = [];
        const podById = new Map(pods.map((p) => [p.id, p]));
        for (let offset = 0; ; offset += 1000) {
          const { data } = await supabase
            .from('episodes')
            .select('*')
            .in('podcast_id', podIds)
            .order('published_at', { ascending: false })
            .range(offset, offset + 999);
          const batch = (data || []) as Episode[];
          allEpisodes.push(...batch.map((e) => ({
            ...e,
            podcast: podById.get(e.podcast_id),
          })));
          if (batch.length < 1000) break;
        }
        setEpisodes(allEpisodes);
      } else {
        setEpisodes([]);
      }

      if (user) {
        const { data: followData } = await supabase
          .from('host_follows')
          .select('host_id')
          .eq('user_id', user.id)
          .eq('host_id', hostRow.id)
          .maybeSingle();
        setIsFollowing(!!followData);
      }

      setLoading(false);
    };

    fetchData();
  }, [slug, user]);

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

  const allHostEpisodes = episodes;
  const totalPlays = podcasts.reduce((sum, p) => sum + (p.plays_count || 0), 0);
  const latestEpisodes = useMemo(
    () => [...allHostEpisodes].sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime()),
    [allHostEpisodes]
  );
  const topEpisodes = useMemo(
    () => [...allHostEpisodes].sort((a, b) => (b.plays_count || 0) - (a.plays_count || 0)),
    [allHostEpisodes]
  );
  const episodesByPodcast = useMemo(() => {
    const map = new Map<string, (Episode & { podcast?: Podcast })[]>();
    for (const ep of allHostEpisodes) {
      const list = map.get(ep.podcast_id);
      if (list) list.push(ep);
      else map.set(ep.podcast_id, [ep]);
    }
    return map;
  }, [allHostEpisodes]);

  const handlePlayAll = () => {
    const queue = latestEpisodes;
    if (queue.length === 0) return;
    if (currentEpisode && queue.some((e) => e.id === currentEpisode.id)) {
      togglePlay();
    } else {
      playEpisode(queue[0], queue[0].podcast || podcasts[0], queue);
    }
  };

  const handlePlayEpisode = (ep: Episode & { podcast?: Podcast }) => {
    if (currentEpisode?.id === ep.id) {
      togglePlay();
    } else {
      playEpisode(ep, ep.podcast || podcasts[0], latestEpisodes);
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
                disabled={latestEpisodes.length === 0}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm bg-accent-500 text-white hover:bg-accent-600 transition-all active:scale-95 disabled:opacity-60"
              >
                {currentEpisode && latestEpisodes.some((e) => e.id === currentEpisode.id) && isPlaying
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
              { icon: Headphones, value: allHostEpisodes.length.toString(), label: 'حلقة' },
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

      {/* Tabs */}
      <div className="flex gap-2 mb-5 border-b border-neutral-200 dark:border-neutral-800 overflow-x-auto no-scrollbar">
        {([
          { id: 'podcasts' as TabId, label: `البودكاست (${podcasts.length})` },
          { id: 'all' as TabId, label: `كل المحتوى (${allHostEpisodes.length} حلقة)` },
          { id: 'latest' as TabId, label: 'أحدث الحلقات' },
          { id: 'top' as TabId, label: 'الأكثر استماعاً' },
        ]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-bold whitespace-nowrap border-b-2 -mb-px transition-all ${
              activeTab === tab.id
                ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'podcasts' && (
        podcasts.length === 0 ? (
          <EmptyState text="لا توجد بودكاست لهذا المقدم بعد" />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {podcasts.map((p) => (
              <PodcastCard key={p.id} podcast={p} />
            ))}
          </div>
        )
      )}

      {activeTab === 'all' && (
        podcasts.length === 0 ? (
          <EmptyState text="لا يوجد محتوى لهذا المقدم بعد" />
        ) : (
          <div className="space-y-8">
            {podcasts.map((p) => {
              const podEpisodes = episodesByPodcast.get(p.id) || [];
              return (
                <section key={p.id}>
                  <div className="flex items-center gap-3 mb-3">
                    {p.cover_url && (
                      <img src={p.cover_url} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/podcasts/${p.id}`}
                        className="block font-extrabold text-neutral-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 truncate"
                      >
                        {p.title}
                      </Link>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">{podEpisodes.length} حلقة</p>
                    </div>
                  </div>
                  {podEpisodes.length > 0 ? (
                    <EpisodeList
                      items={podEpisodes}
                      onPlay={handlePlayEpisode}
                      currentEpisodeId={currentEpisode?.id}
                      isPlaying={isPlaying}
                      initialVisible={8}
                    />
                  ) : (
                    <p className="text-sm text-neutral-400">لا توجد حلقات بعد</p>
                  )}
                </section>
              );
            })}
          </div>
        )
      )}

      {activeTab === 'latest' && (
        latestEpisodes.length === 0 ? (
          <EmptyState text="لا توجد حلقات بعد" />
        ) : (
          <EpisodeList
            items={latestEpisodes}
            onPlay={handlePlayEpisode}
            currentEpisodeId={currentEpisode?.id}
            isPlaying={isPlaying}
          />
        )
      )}

      {activeTab === 'top' && (
        topEpisodes.length === 0 ? (
          <EmptyState text="لا توجد حلقات بعد" />
        ) : (
          <EpisodeList
            items={topEpisodes}
            onPlay={handlePlayEpisode}
            currentEpisodeId={currentEpisode?.id}
            isPlaying={isPlaying}
            showPlays
          />
        )
      )}
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

const EPISODES_PER_PAGE = 40;

function EpisodeList({
  items,
  onPlay,
  currentEpisodeId,
  isPlaying,
  showPlays = false,
  initialVisible = EPISODES_PER_PAGE,
}: {
  items: (Episode & { podcast?: Podcast })[];
  onPlay: (ep: Episode & { podcast?: Podcast }) => void;
  currentEpisodeId?: string;
  isPlaying: boolean;
  showPlays?: boolean;
  initialVisible?: number;
}) {
  const [visible, setVisible] = useState(initialVisible);

  useEffect(() => {
    setVisible(initialVisible);
  }, [items, initialVisible]);

  const shown = items.slice(0, visible);
  const remaining = items.length - shown.length;

  return (
    <div>
      <div className="space-y-2">
        {shown.map((ep) => (
          <EpisodeRow
            key={ep.id}
            ep={ep}
            onPlay={onPlay}
            isCurrent={currentEpisodeId === ep.id}
            isPlaying={isPlaying}
            showPlays={showPlays}
          />
        ))}
      </div>
      {remaining > 0 && (
        <button
          onClick={() => setVisible((v) => v + EPISODES_PER_PAGE)}
          className="mt-3 w-full py-3 rounded-xl text-sm font-bold bg-neutral-100 dark:bg-neutral-800 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-all"
        >
          عرض المزيد ({remaining} حلقة متبقية)
        </button>
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
          <span className="text-xs text-neutral-400">{formatDuration(ep.duration_seconds)}</span>
          <span className="text-xs text-neutral-400">{formatRelativeTime(ep.published_at)}</span>
          {showPlays && ep.plays_count > 0 && (
            <span className="flex items-center gap-1 text-xs text-neutral-400">
              <Headphones size={11} />
              {formatCount(ep.plays_count)}
            </span>
          )}
        </div>
      </div>
      {ep.podcast?.category && (
        <Badge variant="neutral" size="sm" className="hidden sm:inline-flex flex-shrink-0">
          {ep.podcast.category.name_ar}
        </Badge>
      )}
    </div>
  );
}
