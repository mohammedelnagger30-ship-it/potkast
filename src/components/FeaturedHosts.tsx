import { useEffect, useState } from 'react';
import { CarouselSection } from '@/components/CarouselSection';
import { HostCard } from '@/components/HostCard';
import { supabase } from '@/lib/supabase';
import type { Host } from '@/types/podcast';

export function FeaturedHosts() {
  const [hosts, setHosts] = useState<Host[]>([]);

  useEffect(() => {
    supabase
      .from('hosts')
      .select('*, podcasts(count)')
      .order('followers_count', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        const mapped = ((data || []) as unknown as (Host & { podcasts: { count: number }[] })[]).map((h) => ({
          ...h,
          podcasts_count: h.podcasts?.[0]?.count ?? 0,
        }));
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
