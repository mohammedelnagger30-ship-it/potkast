import { useEffect, useState, useCallback } from 'react';
import { Layout } from '@/components/layout';
import { Card, CardHeader, Badge } from '@/components/ui';
import { BookHeart, Plus, Trash2, Mic, Target, Calendar } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { moodMeta, type JournalEntry } from '@/types/features';
import { formatRelativeTime } from '@/types/podcast';

const moodKeys = Object.keys(moodMeta);

export default function JournalPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [mood, setMood] = useState<JournalEntry['mood']>('good');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  const loadEntries = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('entry_date', { ascending: false })
      .limit(50);
    setEntries((data as JournalEntry[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const saveEntry = async () => {
    if (!user || !content.trim()) return;
    setSaving(true);
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('journal_entries')
      .insert({
        user_id: user.id,
        entry_date: today,
        mood,
        content: content.trim(),
      })
      .select('*')
      .maybeSingle();
    if (data) {
      setEntries([data as JournalEntry, ...entries]);
    }
    setContent('');
    setMood('good');
    setShowForm(false);
    setSaving(false);
  };

  const deleteEntry = async (id: string) => {
    await supabase.from('journal_entries').delete().eq('id', id);
    setEntries(entries.filter((e) => e.id !== id));
  };

  return (
    <Layout title="مذكراتي">
      <div className="mb-6">
        <Card className="bg-gradient-to-br from-primary-600 to-primary-800 text-white">
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
        </Card>
      </div>

      {/* New entry button / form */}
      <Card className="mb-6">
        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center justify-center gap-2 w-full py-4 rounded-xl bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-semibold hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-all"
          >
            <Plus size={20} />
            إضافة مدخل اليوم
          </button>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2 block">
                مزاجك اليوم
              </label>
              <div className="flex gap-2 flex-wrap">
                {moodKeys.map((key) => {
                  const meta = moodMeta[key];
                  return (
                    <button
                      key={key}
                      onClick={() => setMood(key as JournalEntry['mood'])}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                        mood === key
                          ? meta.color + ' ring-2 ring-offset-1 ring-primary-400 dark:ring-offset-neutral-900'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'
                      }`}
                    >
                      <span className="text-lg">{meta.emoji}</span>
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2 block">
                ماذا تريد أن تسجل؟
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                placeholder="اكتب تأملاتك، إنجازاتك، أو أي شيء تريد تذكره..."
                className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={saveEntry}
                disabled={saving || !content.trim()}
                className="flex-1 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm transition-all disabled:opacity-50"
              >
                {saving ? 'جاري الحفظ...' : 'حفظ'}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-semibold text-sm hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all"
              >
                إلغاء
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Entries list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 rounded-full border-4 border-primary-600 border-t-transparent animate-spin" />
        </div>
      ) : entries.length > 0 ? (
        <div className="space-y-3">
          {entries.map((entry) => {
            const meta = moodMeta[entry.mood] || moodMeta.neutral;
            return (
              <Card key={entry.id} className="animate-fade-in-up">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${meta.color}`}>
                      {meta.emoji}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-neutral-900 dark:text-white">{meta.label}</p>
                      <p className="text-xs text-neutral-400 flex items-center gap-1">
                        <Calendar size={11} />
                        {formatRelativeTime(entry.entry_date)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteEntry(entry.id)}
                    className="text-neutral-400 hover:text-error-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-wrap">
                  {entry.content}
                </p>
                {(entry.linked_mission_id || entry.linked_episode_id) && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                    {entry.linked_mission_id && (
                      <Badge variant="primary" size="sm">
                        <Target size={12} className="ml-1" /> مهمة
                      </Badge>
                    )}
                    {entry.linked_episode_id && (
                      <Badge variant="accent" size="sm">
                        <Mic size={12} className="ml-1" /> حلقة
                      </Badge>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 mb-4">
            <BookHeart size={36} />
          </div>
          <h3 className="text-lg font-bold text-neutral-600 dark:text-neutral-300">لا توجد مذكرات</h3>
          <p className="text-sm text-neutral-400 mt-1">ابدأ بكتابة أول تأمل لك اليوم</p>
        </div>
      )}
    </Layout>
  );
}
