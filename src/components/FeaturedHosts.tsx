import { useEffect, useState } from 'react';
import { CarouselSection } from '@/components/CarouselSection';
import { HostCard } from '@/components/HostCard';
import { supabase } from '@/lib/supabase';
import type { Host } from '@/types/podcast';

// Survives navigation between Home and other tabs: the featured list barely
// changes, so re-fetching it on every home mount only slows the first paint.
let cachedHosts: Host[] | null = null;
let cachedAt = 0;
const CACHE_TTL = 10 * 60 * 1000;

export function FeaturedHosts() {
  const [hosts, setHosts] = useState<Host[]>(() =>
    cachedHosts && Date.now() - cachedAt < CACHE_TTL ? cachedHosts : []
  );

  useEffect(() => {
    if (cachedHosts && Date.now() - cachedAt < CACHE_TTL) return;
    supabase
      .from('hosts')
      .select('id,name_ar,slug,photo_url,cover_url,title_ar,specialty_ar,is_verified,followers_count,podcasts(count)')
      .order('followers_count', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        const mapped = ((data || []) as unknown as (Host & { podcasts: { count: number }[] })[]).map((h) => ({
          ...h,
          podcasts_count: h.podcasts?.[0]?.count ?? 0,
        }));
        cachedHosts = mapped;
        cachedAt = Date.now();
        setHosts(mapped);
      });
  }, []);

  if (hosts.length === 0) return null;

  return (
    <CarouselSection title="مقدمون مميزون" subtitle="نخبة من الخبراء والعلماء">
      {hosts.map((host) => (
        <HostCard key={host.id} host={host} compact />
      ))}
    </CarouselSection>
  );
}
