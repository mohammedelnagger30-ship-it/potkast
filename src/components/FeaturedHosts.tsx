import { CarouselSection } from '@/components/CarouselSection';
import { HostCard } from '@/components/HostCard';
import { FEATURED_HOSTS, type FeaturedPerson } from '@/lib/featuredHosts';
import type { Host } from '@/types/podcast';

/** Keep the curated order; the cards are links to courses and episodes only. */
function toHost(person: FeaturedPerson): Host {
  return {
    id: person.slug,
    name_ar: person.name,
    slug: person.slug,
    photo_url: person.photo,
    cover_url: '',
    title_ar: person.title,
    specialty_ar: person.specialty,
    bio_ar: '',
    country: 'الوطن العربي',
    category_id: null,
    is_verified: true,
    followers_count: 0,
    social_links: {},
    created_at: new Date(0).toISOString(),
  };
}

export function FeaturedHosts() {
  return (
    <CarouselSection title="أشهر مقدمين العرب" subtitle="دوراتهم وحلقاتهم داخل سدى">
      {FEATURED_HOSTS.map((person) => (
        <HostCard key={person.name} host={toHost(person)} compact />
      ))}
    </CarouselSection>
  );
}
