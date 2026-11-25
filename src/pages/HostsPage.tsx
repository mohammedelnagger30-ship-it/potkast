import { useEffect, useState, useCallback, useMemo } from 'react';
import { Search, X, ArrowUpDown } from 'lucide-react';
import { Layout } from '@/components/layout';
import { HostCard } from '@/components/HostCard';
import { supabase } from '@/lib/supabase';
import { matchesAnyArabicSearch } from '@/lib/arabicSearch';
import type { Host } from '@/types/podcast';

type SortOption = 'fame' | 'followers' | 'popular' | 'newest' | 'az';

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'fame', label: 'الأكثر شهرة' },
  { value: 'followers', label: 'الأكثر متابعة' },
  { value: 'popular', label: 'الأكثر شعبية' },
  { value: 'newest', label: 'الأحدث' },
  { value: 'az', label: 'أ - ي' },
];

export default function HostsPage() {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('fame');

  const fetchHosts = useCallback(async () => {
    const { data, error } = await supabase
      .from('hosts')
      .select('*, category:categories(*), podcasts(count)')
      .order('followers_count', { ascending: false });

    if (error) {
      setLoading(false);
      return;
    }

    const mapped = ((data || []) as unknown as (Host & { podcasts: { count: number }[] })[]).map((h) => ({
      ...h,
      podcasts_count: h.podcasts?.[0]?.count ?? 0,
    }));
    setHosts(mapped);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchHosts();
  }, [fetchHosts]);

  // Only categories that actually have hosts, de-duplicated by Arabic name
  // (the categories table holds several rows per name). Use the name itself
  // as the filter value so all duplicate-id rows are included together.
  const categoryOptions = useMemo(() => {
    const names = new Set<string>();
    for (const h of hosts) {
      if (h.category?.name_ar) names.add(h.category.name_ar);
    }
    return [...names].sort((a, b) => a.localeCompare(b, 'ar'));
  }, [hosts]);

  const filtered = hosts
    .filter((h) => {
      if (
        searchQuery &&
        !matchesAnyArabicSearch(searchQuery, h.name_ar, h.specialty_ar, h.title_ar, h.bio_ar, h.country)
      ) return false;
      if (selectedCategory !== 'all' && h.category?.name_ar !== selectedCategory) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'fame': {
          const score = (h: Host) =>
            h.followers_count + (h.is_verified ? 80000 : 0) + (h.podcasts_count ?? 0) * 1500;
          return score(b) - score(a);
        }
        case 'followers':
          return b.followers_count - a.followers_count;
        case 'popular': {
          const pa = (a.podcasts_count ?? 0) * 1000 + a.followers_count;
          const pb = (b.podcasts_count ?? 0) * 1000 + b.followers_count;
          return pb - pa;
        }
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'az':
          return a.name_ar.localeCompare(b.name_ar, 'ar');
      }
    });

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
          placeholder="ابحث عن مقدم أو تخصص... (يدعم البحث بدون همزات/تشكيل)"
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
      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4">
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
