import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  BookHeart,
  CalendarDays,
  CheckCircle2,
  Download,
  Flame,
  Mic,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Target,
  Trash2,
  X,
} from 'lucide-react';
import { Layout } from '@/components/layout';
import { Button, Card, CardHeader, Badge } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { matchesArabicSearch } from '@/lib/arabicSearch';
import { moodMeta, type JournalEntry } from '@/types/features';

type Mood = JournalEntry['mood'];
type RangeKey = 'all' | 'week' | 'month';
type LinkOption = { id: string; title: string; podcastId?: string | null };

type FormState = {
  entry_date: string;
  mood: Mood;
  content: string;
  linked_mission_id: string;
  linked_episode_id: string;
};

const moodKeys = Object.keys(moodMeta) as Mood[];

const writingPrompts = [
  { label: 'امتنان', text: 'ثلاثة أشياء أنا ممتن لها اليوم:' },
  { label: 'تعلّم', text: 'أهم ما تعلّمته اليوم من حلقة أو مهمة:' },
  { label: 'تحدٍ', text: 'تحدٍ واجهته اليوم وكيف تعاملت معه:' },
  { label: 'خطوة الغد', text: 'خطوة واحدة واضحة سأفعلها غداً:' },
];

const rangeOptions: { key: RangeKey; label: string }[] = [
  { key: 'all', label: 'الكل' },
  { key: 'week', label: 'آخر ٧ أيام' },
  { key: 'month', label: 'آخر ٣٠ يوماً' },
];

function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dateFromKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

function addDays(key: string, delta: number): string {
  const date = dateFromKey(key);
  date.setDate(date.getDate() + delta);
  return localDateKey(date);
}

function fullDayLabel(key: string): string {
  return dateFromKey(key).toLocaleDateString('ar-EG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function relativeDayLabel(key: string, today: string): string {
  if (key === today) return 'اليوم';
  if (key === addDays(today, -1)) return 'أمس';
  return dateFromKey(key).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' });
}

function computeStreak(dates: string[], today: string): number {
  const unique = new Set(dates);
  let cursor = unique.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (unique.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function emptyForm(today: string): FormState {
  return {
    entry_date: today,
    mood: 'good',
    content: '',
    linked_mission_id: '',
    linked_episode_id: '',
  };
}

export default function JournalPage() {
  const { user } = useAuth();
  const todayKey = localDateKey();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<JournalEntry | null>(null);
  const [form, setForm] = useState<FormState>(() => emptyForm(localDateKey()));

  const [query, setQuery] = useState('');
  const [moodFilter, setMoodFilter] = useState<Mood | 'all'>('all');
  const [range, setRange] = useState<RangeKey>('all');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(8);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [missions, setMissions] = useState<LinkOption[]>([]);
  const [episodes, setEpisodes] = useState<LinkOption[]>([]);

  const loadEntries = useCallback(async () => {
    if (!user) {
      setEntries([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: loadError } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(200);
    if (loadError) setError('تعذّر تحميل المذكرات. حاول التحديث.');
    setEntries((data as JournalEntry[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  useEffect(() => {
    if (!user) {
      setMissions([]);
      setEpisodes([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const [missionResult, episodeResult] = await Promise.all([
        supabase.from('missions').select('id,title').order('title', { ascending: true }).limit(300),
        supabase
          .from('episodes')
          .select('id,title,podcast_id,podcast:podcasts(id,title)')
          .order('published_at', { ascending: false })
          .limit(200),
      ]);
      if (cancelled) return;
      setMissions(
        (missionResult.data || []).map((row) => ({
          id: (row as { id: string }).id,
          title: (row as { title: string }).title,
        })),
      );
      setEpisodes(
        (episodeResult.data || []).map((row) => {
          const typed = row as {
            id: string;
            title: string;
            podcast_id: string | null;
            podcast: { id: string; title: string } | { id: string; title: string }[] | null;
          };
          const podcast = firstRelation(typed.podcast);
          return {
            id: typed.id,
            title: typed.title,
            podcastId: podcast?.id ?? typed.podcast_id ?? null,
          };
        }),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    setVisibleCount(8);
  }, [query, moodFilter, range, selectedDate]);

  const sortedEntries = useMemo(
    () =>
      [...entries].sort(
        (a, b) =>
          b.entry_date.localeCompare(a.entry_date) ||
          String(b.created_at || '').localeCompare(String(a.created_at || '')),
      ),
    [entries],
  );

  const entriesByDate = useMemo(() => {
    const map = new Map<string, JournalEntry[]>();
    sortedEntries.forEach((entry) => {
      const list = map.get(entry.entry_date) || [];
      list.push(entry);
      map.set(entry.entry_date, list);
    });
    return map;
  }, [sortedEntries]);

  const stats = useMemo(() => {
    const weekStart = addDays(todayKey, -6);
    const monthStart = addDays(todayKey, -29);
    const counts = new Map<Mood, number>();
    sortedEntries.forEach((entry) => {
      counts.set(entry.mood, (counts.get(entry.mood) || 0) + 1);
    });
    const dominant =
      sortedEntries.length === 0
        ? null
        : moodKeys.reduce<Mood | null>((best, mood) => {
            const bestCount = best ? counts.get(best) || 0 : -1;
            return (counts.get(mood) || 0) > bestCount ? mood : best;
          }, null);
    return {
      total: sortedEntries.length,
      streak: computeStreak(
        sortedEntries.map((entry) => entry.entry_date),
        todayKey,
      ),
      week: sortedEntries.filter((entry) => entry.entry_date >= weekStart).length,
      month: sortedEntries.filter((entry) => entry.entry_date >= monthStart).length,
      dominant,
    };
  }, [sortedEntries, todayKey]);

  const filteredEntries = useMemo(() => {
    const rangeStart = range === 'week' ? addDays(todayKey, -6) : range === 'month' ? addDays(todayKey, -29) : null;
    return sortedEntries.filter((entry) => {
      if (selectedDate && entry.entry_date !== selectedDate) return false;
      if (moodFilter !== 'all' && entry.mood !== moodFilter) return false;
      if (rangeStart && entry.entry_date < rangeStart) return false;
      if (query.trim() && !matchesArabicSearch(entry.content, query)) return false;
      return true;
    });
  }, [sortedEntries, selectedDate, moodFilter, range, query, todayKey]);

  const lastSevenDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(todayKey, index - 6)),
    [todayKey],
  );

  const hasFilters = Boolean(query.trim()) || moodFilter !== 'all' || range !== 'all' || Boolean(selectedDate);
  const nf = (value: number) => value.toLocaleString('ar-EG');

  const clearFilters = () => {
    setQuery('');
    setMoodFilter('all');
    setRange('all');
    setSelectedDate(null);
  };

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm(todayKey));
    setShowForm(true);
    setError(null);
  };

  const openEdit = (entry: JournalEntry) => {
    setEditing(entry);
    setForm({
      entry_date: entry.entry_date,
      mood: entry.mood,
      content: entry.content,
      linked_mission_id: entry.linked_mission_id || '',
      linked_episode_id: entry.linked_episode_id || '',
    });
    setShowForm(true);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeForm = () => {
    setEditing(null);
    setForm(emptyForm(todayKey));
    setShowForm(false);
    setError(null);
  };

  const appendPrompt = (text: string) => {
    setForm((current) => ({
      ...current,
      content: current.content.trim() ? `${current.content.trimEnd()}\n${text}` : text,
    }));
    window.requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const saveEntry = async () => {
    const content = form.content.trim();
    if (!user || !content) return;
    setSaving(true);
    setError(null);

    const payload = {
      entry_date: form.entry_date || todayKey,
      mood: form.mood,
      content,
      linked_mission_id: form.linked_mission_id || null,
      linked_episode_id: form.linked_episode_id || null,
      updated_at: new Date().toISOString(),
    };

    const result = editing
      ? await supabase
          .from('journal_entries')
          .update(payload)
          .eq('id', editing.id)
          .eq('user_id', user.id)
          .select('*')
          .maybeSingle()
      : await supabase
          .from('journal_entries')
          .insert({ ...payload, user_id: user.id })
          .select('*')
          .maybeSingle();

    if (result.error || !result.data) {
      setError('تعذّر حفظ المدخل. تأكد من الاتصال ثم حاول مرة أخرى.');
      setSaving(false);
      return;
    }

    const saved = result.data as JournalEntry;
    setEntries((current) => {
      const next = editing
        ? current.map((entry) => (entry.id === saved.id ? saved : entry))
        : [saved, ...current];
      return next.sort(
        (a, b) =>
          b.entry_date.localeCompare(a.entry_date) ||
          String(b.created_at || '').localeCompare(String(a.created_at || '')),
      );
    });
    closeForm();
    setToast(editing ? 'تم تعديل المدخل بنجاح' : 'تم حفظ المدخل بنجاح');
    setSaving(false);
  };

  const deleteEntry = async (id: string) => {
    if (!user) return;
    setError(null);
    const { error: deleteError } = await supabase
      .from('journal_entries')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    if (deleteError) {
      setError('تعذّر حذف المدخل. حاول مرة أخرى.');
      return;
    }
    setEntries((current) => current.filter((entry) => entry.id !== id));
    setConfirmDeleteId(null);
    setToast('تم حذف المدخل');
  };

  const exportEntries = () => {
    const blocks = filteredEntries.map((entry) => {
      const mood = moodMeta[entry.mood] || moodMeta.neutral;
      const mission = missions.find((item) => item.id === entry.linked_mission_id)?.title;
      const episode = episodes.find((item) => item.id === entry.linked_episode_id)?.title;
      const links = [mission && `- مهمة: ${mission}`, episode && `- حلقة: ${episode}`].filter(Boolean);
      return [
        `## ${fullDayLabel(entry.entry_date)} — ${mood.label}`,
        '',
        entry.content,
        ...(links.length ? ['', ...links] : []),
      ].join('\n');
    });
    const file = `# مذكرات سدى\n\n${blocks.join('\n\n---\n\n')}\n`;
    const url = URL.createObjectURL(new Blob([file], { type: 'text/markdown;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'مذكرات-سدى.md';
    anchor.click();
    URL.revokeObjectURL(url);
    setToast('تم تصدير المذكرات المعروضة');
  };

  return (
    <Layout title="مذكراتي">
      <div className="space-y-6">
        <Card className="bg-gradient-to-br from-primary-600 to-primary-800 text-white">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <BookHeart size={28} />
              </div>
              <div>
                <h2 className="text-xl font-extrabold">مذكراتي اليومية</h2>
                <p className="text-primary-100 text-sm mt-0.5">
                  اكتب أفكارك ومشاعرك واربطها بمهامك وحلقاتك
                </p>
              </div>
            </div>
            {!showForm && (
              <Button
                size="sm"
                variant="secondary"
                leftIcon={<Plus size={16} />}
                onClick={openNew}
                className="border-0 bg-white/20 text-white hover:bg-white/30 dark:bg-white/20 dark:text-white dark:hover:bg-white/30"
              >
                مدخل جديد
              </Button>
            )}
          </div>
        </Card>

        {toast && (
          <div className="flex items-center gap-2 rounded-xl bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-800 px-4 py-3 text-sm font-semibold text-primary-800 dark:text-primary-200">
            <CheckCircle2 size={18} />
            {toast}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-error-500/10 border border-error-500/30 px-4 py-3 text-sm font-semibold text-error-600 dark:text-error-400">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <Card>
          <CardHeader
            title="نظرة على رحلتك"
            subtitle="تتحدث الأرقام تلقائياً كل ما أضفت أو عدّلت مدخلاً"
            action={<Badge variant="accent" size="sm">{nf(stats.streak)} يوم متتالي</Badge>}
          />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'إجمالي المدخلات', value: nf(stats.total), icon: BookHeart },
              { label: 'هذا الأسبوع', value: nf(stats.week), icon: CalendarDays },
              { label: 'هذا الشهر', value: nf(stats.month), icon: Sparkles },
              {
                label: 'المزاج الغالب',
                value: stats.dominant ? moodMeta[stats.dominant].label : '—',
                icon: Flame,
              },
            ].map(({ label, value, icon: Icon }) => (
              <div
                key={label}
                className="rounded-xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/40 p-3"
              >
                <div className="flex items-center gap-2 text-neutral-400 mb-1.5">
                  <Icon size={15} />
                  <span className="text-[11px] font-semibold">{label}</span>
                </div>
                <p className="text-lg font-extrabold text-neutral-900 dark:text-white break-words">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 pt-5 border-t border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center justify-between gap-3 mb-3">
              <p className="text-sm font-bold text-neutral-700 dark:text-neutral-200">آخر ٧ أيام</p>
              <button
                onClick={() => {
                  setSelectedDate(null);
                  setRange('all');
                }}
                className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline"
              >
                كل الأيام
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {lastSevenDays.map((day) => {
                const dayEntries = entriesByDate.get(day) || [];
                const isSelected = selectedDate === day;
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDate(isSelected ? null : day)}
                    aria-label={`تصفية مذكرات ${fullDayLabel(day)}`}
                    className={`rounded-xl border px-1 py-2 text-center transition-all ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 ring-1 ring-primary-400'
                        : 'border-neutral-100 dark:border-neutral-800 hover:border-primary-300 dark:hover:border-primary-700'
                    }`}
                  >
                    <span className="block text-[10px] text-neutral-400 truncate">
                      {dateFromKey(day).toLocaleDateString('ar-EG', { weekday: 'short' })}
                    </span>
                    <span className="block text-sm font-extrabold text-neutral-800 dark:text-neutral-100">
                      {dateFromKey(day).getDate().toLocaleString('ar-EG')}
                    </span>
                    <span className="block text-base leading-5 h-5">
                      {dayEntries.length ? moodMeta[dayEntries[0].mood]?.emoji : '·'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </Card>

        {showForm && (
          <Card>
            <CardHeader
              title={editing ? 'تعديل المدخل' : 'مدخل جديد'}
              subtitle="اختر التاريخ والمزاج، واربط المدخل بمهمة أو حلقة حقيقية"
              action={
                <Button variant="ghost" size="sm" onClick={closeForm} aria-label="إغلاق النموذج">
                  <X size={18} />
                </Button>
              }
            />
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="journal-date" className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2 block">
                    التاريخ
                  </label>
                  <input
                    id="journal-date"
                    type="date"
                    max={todayKey}
                    value={form.entry_date}
                    onChange={(event) => setForm((current) => ({ ...current, entry_date: event.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                  />
                </div>
                <div>
                  <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2 block">
                    مزاجك
                  </span>
                  <div className="flex gap-1.5 flex-wrap">
                    {moodKeys.map((key) => {
                      const meta = moodMeta[key];
                      return (
                        <button
                          key={key}
                          onClick={() => setForm((current) => ({ ...current, mood: key }))}
                          className={`px-2.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                            form.mood === key
                              ? `${meta.color} ring-2 ring-primary-400 ring-offset-1 dark:ring-offset-neutral-900`
                              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'
                          }`}
                        >
                          <span className="text-base ml-1">{meta.emoji}</span>
                          {meta.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div>
                <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2 block">
                  أفكار تبدأ منها
                </span>
                <div className="flex gap-2 flex-wrap">
                  {writingPrompts.map((prompt) => (
                    <button
                      key={prompt.label}
                      onClick={() => appendPrompt(prompt.text)}
                      className="rounded-lg border border-primary-200 dark:border-primary-800 bg-primary-50/60 dark:bg-primary-900/20 px-3 py-1.5 text-xs font-semibold text-primary-700 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-900/40"
                    >
                      {prompt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="journal-content" className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2 block">
                  ماذا تريد أن تسجل؟
                </label>
                <textarea
                  id="journal-content"
                  ref={textareaRef}
                  value={form.content}
                  onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))}
                  rows={5}
                  placeholder="اكتب تأملاتك، إنجازاتك، أو أي شيء تريد تذكره..."
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="journal-mission" className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2 block">
                    ربط بمهمة
                  </label>
                  <select
                    id="journal-mission"
                    value={form.linked_mission_id}
                    onChange={(event) => setForm((current) => ({ ...current, linked_mission_id: event.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                  >
                    <option value="">بدون ربط</option>
                    {missions.map((mission) => (
                      <option key={mission.id} value={mission.id}>
                        {mission.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="journal-episode" className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2 block">
                    ربط بحلقة
                  </label>
                  <select
                    id="journal-episode"
                    value={form.linked_episode_id}
                    onChange={(event) => setForm((current) => ({ ...current, linked_episode_id: event.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                  >
                    <option value="">بدون ربط</option>
                    {episodes.map((episode) => (
                      <option key={episode.id} value={episode.id}>
                        {episode.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <span className="text-xs text-neutral-400">{nf(form.content.trim().length)} حرف</span>
                <div className="flex gap-2">
                  <Button onClick={saveEntry} disabled={saving || !form.content.trim()} leftIcon={<CheckCircle2 size={16} />}>
                    {saving ? 'جاري الحفظ...' : editing ? 'حفظ التعديل' : 'حفظ'}
                  </Button>
                  <Button variant="secondary" onClick={closeForm} disabled={saving}>
                    إلغاء
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}

        {!showForm && (
          <button
            onClick={openNew}
            className="flex items-center justify-center gap-2 w-full py-4 rounded-xl bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-semibold hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-all"
          >
            <Plus size={20} />
            إضافة مدخل اليوم
          </button>
        )}

        <Card>
          <div className="space-y-4">
            <div className="relative">
              <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="ابحث في مذكراتك"
                className="w-full pr-10 pl-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-neutral-500">المزاج</span>
              <button
                onClick={() => setMoodFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  moodFilter === 'all'
                    ? 'bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'
                }`}
              >
                الكل
              </button>
              {moodKeys.map((key) => {
                const meta = moodMeta[key];
                return (
                  <button
                    key={key}
                    onClick={() => setMoodFilter(moodFilter === key ? 'all' : key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      moodFilter === key
                        ? `${meta.color} ring-2 ring-primary-400 ring-offset-1 dark:ring-offset-neutral-900`
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'
                    }`}
                  >
                    <span className="ml-1">{meta.emoji}</span>
                    {meta.label}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex gap-2 flex-wrap">
                {rangeOptions.map((option) => (
                  <button
                    key={option.key}
                    onClick={() => setRange(option.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      range === option.key
                        ? 'bg-primary-600 text-white'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<Download size={15} />}
                  onClick={exportEntries}
                  disabled={!filteredEntries.length}
                >
                  تصدير المعروض
                </Button>
                {hasFilters && (
                  <Button variant="ghost" size="sm" leftIcon={<X size={15} />} onClick={clearFilters}>
                    مسح الفلاتر
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 rounded-full border-4 border-primary-600 border-t-transparent animate-spin" />
          </div>
        ) : filteredEntries.length > 0 ? (
          <div className="space-y-3">
            {filteredEntries.slice(0, visibleCount).map((entry) => {
              const meta = moodMeta[entry.mood] || moodMeta.neutral;
              const missionTitle = missions.find((item) => item.id === entry.linked_mission_id)?.title;
              const episodeOption = episodes.find((item) => item.id === entry.linked_episode_id);
              return (
                <Card key={entry.id} className="animate-fade-in-up">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${meta.color}`}>
                        {meta.emoji}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-sm text-neutral-900 dark:text-white">{meta.label}</p>
                          <Badge variant="neutral" size="sm">{relativeDayLabel(entry.entry_date, todayKey)}</Badge>
                        </div>
                        <p className="text-xs text-neutral-400 flex items-center gap-1 mt-0.5">
                          <CalendarDays size={11} />
                          {fullDayLabel(entry.entry_date)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => openEdit(entry)}
                        aria-label="تعديل المدخل"
                        className="p-2 rounded-lg text-neutral-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(confirmDeleteId === entry.id ? null : entry.id)}
                        aria-label="حذف المدخل"
                        className="p-2 rounded-lg text-neutral-400 hover:text-error-500 hover:bg-error-500/10 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {confirmDeleteId === entry.id && (
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-error-500/10 px-3 py-2 text-sm text-error-600 dark:text-error-400">
                      <span className="font-semibold">حذف هذا المدخل نهائياً؟</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => deleteEntry(entry.id)}
                          className="rounded-lg bg-error-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-error-700"
                        >
                          تأكيد الحذف
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="rounded-lg px-3 py-1.5 text-xs font-bold text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                        >
                          إلغاء
                        </button>
                      </div>
                    </div>
                  )}

                  <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-wrap break-words">
                    {entry.content}
                  </p>

                  {(entry.linked_mission_id || entry.linked_episode_id) && (
                    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                      {entry.linked_mission_id && (
                        <Link
                          to="/missions"
                          className="inline-flex items-center gap-1.5 rounded-lg bg-primary-50 dark:bg-primary-900/20 px-2.5 py-1.5 text-xs font-semibold text-primary-700 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-900/40"
                        >
                          <Target size={12} />
                          {missionTitle || 'مهمة غير متاحة'}
                        </Link>
                      )}
                      {entry.linked_episode_id && (
                        <Link
                          to={episodeOption?.podcastId ? `/podcasts/${episodeOption.podcastId}` : '/podcasts'}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-accent-500/10 px-2.5 py-1.5 text-xs font-semibold text-accent-600 dark:text-accent-400 hover:bg-accent-500/20"
                        >
                          <Mic size={12} />
                          {episodeOption?.title || 'حلقة غير متاحة'}
                        </Link>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}

            {filteredEntries.length > visibleCount && (
              <Button
                variant="secondary"
                fullWidth
                onClick={() => setVisibleCount((count) => count + 8)}
              >
                عرض المزيد ({nf(filteredEntries.length - visibleCount)})
              </Button>
            )}
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 mb-4">
              <BookHeart size={36} />
            </div>
            <h3 className="text-lg font-bold text-neutral-600 dark:text-neutral-300">لا توجد مذكرات</h3>
            <p className="text-sm text-neutral-400 mt-1">ابدأ بكتابة أول تأمل لك اليوم</p>
            <Button size="sm" variant="outline" leftIcon={<Plus size={15} />} onClick={openNew} className="mt-4">
              إضافة مدخل
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 mb-4">
              <Search size={36} />
            </div>
            <h3 className="text-lg font-bold text-neutral-600 dark:text-neutral-300">لا توجد نتائج مطابقة</h3>
            <p className="text-sm text-neutral-400 mt-1">جرّب تغيير البحث أو الفلاتر</p>
            <Button size="sm" variant="outline" onClick={clearFilters} className="mt-4">
              مسح الفلاتر
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
