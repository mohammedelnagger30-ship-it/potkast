import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/layout';
import { Card } from '@/components/ui';
import { Bell, CheckCircle, Target, Award, Mic, Check, Trash2, Lightbulb, AlertCircle, Download, Megaphone, Search, Inbox } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { matchesArabicSearch } from '@/lib/arabicSearch';
import { NOTIFICATION_TYPE_OPTIONS } from '@/lib/notifications';

interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  created_at: string;
}

const iconMap: Record<string, typeof Bell> = {
  mission_assigned: Target,
  mission_completed: CheckCircle,
  achievement: Award,
  new_episode: Mic,
  reminder: Bell,
  tip: Lightbulb,
  streak_lost: AlertCircle,
  app_update: Download,
  admin: Megaphone,
};

const typeLabels: Record<string, string> = Object.fromEntries(
  NOTIFICATION_TYPE_OPTIONS.map((option) => [option.key, option.label]),
);

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'الآن';
  if (diffMins < 60) return `قبل ${diffMins} دقيقة`;
  if (diffHrs < 24) return `قبل ${diffHrs} ساعة`;
  if (diffDays === 1) return 'أمس';
  if (diffDays < 7) return `قبل ${diffDays} أيام`;
  if (diffDays < 14) return 'قبل أسبوع';
  return `قبل ${Math.floor(diffDays / 7)} أسابيع`;
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(20);
  const [toast, setToast] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) setToast('تعذّر تحميل الإشعارات. حاول التحديث.');
    else if (data) setNotifications(data as AppNotification[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // New notifications arrive live — no reload needed.
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const incoming = payload.new as AppNotification;
            setNotifications((current) =>
              current.some((item) => item.id === incoming.id) ? current : [incoming, ...current]
            );
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as AppNotification;
            setNotifications((current) => current.map((item) => item.id === updated.id ? updated : item));
          } else if (payload.eventType === 'DELETE') {
            const removed = (payload.old as { id?: string }).id;
            setNotifications((current) => current.filter((item) => item.id !== removed));
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const markAsRead = async (id: string) => {
    const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);
    if (error) { setToast('تعذّر تحديد الإشعار كمقروء'); return; }
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = async () => {
    if (!user) return;
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);
    if (error) { setToast('تعذّر تحديث الإشعارات'); return; }
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const deleteNotification = async (id: string) => {
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    if (error) { setToast('تعذّر حذف الإشعار'); return; }
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const deleteAllRead = async () => {
    if (!user) return;
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', user.id)
      .eq('read', true);
    if (error) { setToast('تعذّر حذف الإشعارات المقروءة'); return; }
    setNotifications((prev) => prev.filter((n) => !n.read));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;
  const readCount = notifications.length - unreadCount;

  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      if (statusFilter === 'unread' && n.read) return false;
      if (statusFilter === 'read' && !n.read) return false;
      if (typeFilter !== 'all' && n.type !== typeFilter) return false;
      if (query.trim() && !matchesArabicSearch(`${n.title} ${n.body}`, query)) return false;
      return true;
    });
  }, [notifications, statusFilter, typeFilter, query]);

  if (loading) {
    return (
      <Layout title="الإشعارات">
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 rounded-full border-4 border-primary-600 border-t-transparent animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="الإشعارات">
      {toast && (
        <div className="mb-4 rounded-xl bg-warning-500/10 border border-warning-500/30 px-4 py-3 text-sm font-semibold text-warning-700 dark:text-warning-300">
          {toast}
        </div>
      )}

      {notifications.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-neutral-500 dark:text-neutral-400 min-w-0">
            {unreadCount > 0
              ? `لديك ${unreadCount} إشعار غير مقروء`
              : 'كل الإشعارات مقروءة'}
          </p>
          <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2">
            {readCount > 0 && (
              <button
                onClick={deleteAllRead}
                className="flex items-center gap-1 text-sm font-semibold text-error-600 dark:text-error-400 hover:underline"
              >
                <Trash2 size={14} />
                حذف المقروءة
              </button>
            )}
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-1 text-sm font-semibold text-primary-600 dark:text-primary-400 hover:underline"
              >
                <Check size={14} />
                تعليم الكل كمقروء
              </button>
            )}
          </div>
        </div>
      )}

      <div className="mb-4 space-y-3">
        <div className="relative">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ابحث في إشعاراتك"
            className="w-full pr-9 pl-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {([
            { key: 'all', label: 'الكل' },
            { key: 'unread', label: `غير المقروءة (${unreadCount})` },
            { key: 'read', label: 'المقروءة' },
          ] as const).map((option) => (
            <button
              key={option.key}
              onClick={() => { setStatusFilter(option.key); setVisibleCount(20); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === option.key
                  ? 'bg-primary-600 text-white'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
              }`}
            >
              {option.label}
            </button>
          ))}
          {(query || statusFilter !== 'all' || typeFilter !== 'all') && (
            <button
              onClick={() => { setQuery(''); setStatusFilter('all'); setTypeFilter('all'); setVisibleCount(20); }}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-error-600 dark:text-error-400 bg-error-500/10"
            >
              مسح الفلاتر
            </button>
          )}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {['all', ...NOTIFICATION_TYPE_OPTIONS.map((option) => option.key)].map((type) => (
            <button
              key={type}
              onClick={() => { setTypeFilter(type); setVisibleCount(20); }}
              className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                typeFilter === type
                  ? 'bg-accent-500 text-white'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
              }`}
            >
              {type === 'all' ? 'كل الأنواع' : typeLabels[type] || type}
            </button>
          ))}
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.slice(0, visibleCount).map((n) => {
            const Icon = iconMap[n.type] || Bell;
            return (
              <Card
                key={n.id}
                className={`flex items-start gap-4 animate-fade-in-up transition-all group ${n.read ? '' : 'border-r-4 border-r-primary-500'}`}
              >
                <div className={`flex-shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center ${
                  n.read
                    ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400'
                    : 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                }`}>
                  <Icon size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-bold text-neutral-900 dark:text-neutral-100">{n.title}</h3>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0" />}
                  </div>
                  {n.body && (
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 break-words">{n.body}</p>
                  )}
                  <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                    {formatRelativeTime(n.created_at)}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[11px] font-semibold text-primary-500">
                      {typeLabels[n.type] || n.type}
                    </span>
                    {n.link && (
                      <Link
                        to={n.link}
                        onClick={() => { if (!n.read) void markAsRead(n.id); }}
                        className="text-[11px] font-bold text-primary-600 dark:text-primary-400 hover:underline"
                      >
                        افتح الإشعار ←
                      </Link>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-center gap-2 flex-shrink-0">
                  {!n.read && (
                    <button
                      onClick={() => markAsRead(n.id)}
                      className="text-xs text-primary-600 dark:text-primary-400 font-semibold hover:underline"
                      title="تعليم كمقروء"
                    >
                      <Check size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(n.id)}
                    className="text-neutral-400 hover:text-error-500 transition-colors"
                    title="حذف"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </Card>
            );
          })}
          {filtered.length > visibleCount && (
            <div className="text-center pt-2">
              <button
                onClick={() => setVisibleCount((count) => count + 20)}
                className="px-4 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-sm font-bold text-neutral-600 dark:text-neutral-300"
              >
                عرض المزيد ({filtered.length - visibleCount} متبقية)
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 mb-4">
            {notifications.length > 0 ? <Search size={36} /> : <Inbox size={36} />}
          </div>
          <h3 className="text-lg font-bold text-neutral-600 dark:text-neutral-300">
            {notifications.length > 0 ? 'لا توجد نتائج مطابقة' : 'لا توجد إشعارات'}
          </h3>
          <p className="text-sm text-neutral-400 mt-1">
            {notifications.length > 0 ? 'جرّب تغيير الفلاتر أو مسح البحث' : 'ستظهر إشعاراتك هنا عند وصولها'}
          </p>
        </div>
      )}
    </Layout>
  );
}
