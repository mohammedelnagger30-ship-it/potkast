import { useEffect, useState, useCallback } from 'react';
import { Layout } from '@/components/layout';
import { Card } from '@/components/ui';
import { Bell, CheckCircle, Target, Award, Mic, Check, Trash2, Lightbulb, AlertCircle, Download } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

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
};

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

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setNotifications(data as AppNotification[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = async () => {
    if (!user) return;
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const deleteNotification = async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const deleteAllRead = async () => {
    if (!user) return;
    await supabase
      .from('notifications')
      .delete()
      .eq('user_id', user.id)
      .eq('read', true);
    setNotifications((prev) => prev.filter((n) => !n.read));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;
  const readCount = notifications.length - unreadCount;

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
      {notifications.length > 0 && (
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {unreadCount > 0
              ? `لديك ${unreadCount} إشعار غير مقروء`
              : 'كل الإشعارات مقروءة'}
          </p>
          <div className="flex items-center gap-3">
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

      {notifications.length > 0 ? (
        <div className="space-y-3">
          {notifications.map((n) => {
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
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">{n.body}</p>
                  )}
                  <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                    {formatRelativeTime(n.created_at)}
                  </p>
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
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 mb-4">
            <Bell size={36} />
          </div>
          <h3 className="text-lg font-bold text-neutral-600 dark:text-neutral-300">لا توجد إشعارات</h3>
          <p className="text-sm text-neutral-400 mt-1">ستظهر إشعاراتك هنا عند وصولها</p>
        </div>
      )}
    </Layout>
  );
}
