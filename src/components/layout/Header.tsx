import { useEffect, useState } from 'react';
import { Moon, Sun, Bell, Download, Settings2, UserRound, ShieldCheck } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useAdminStatus } from '@/lib/admin';
import { supabase } from '@/lib/supabase';
import { getUnreadNotificationCount } from '@/lib/notifications';

export function Header({ title }: { title: string }) {
  const { theme, toggleTheme } = useTheme();
  const { isAdmin } = useAdminStatus();
  const { user } = useAuth();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    let active = true;
    const refresh = async () => {
      const count = await getUnreadNotificationCount(user.id);
      if (active) setUnreadCount(count);
    };
    void refresh();

    const channel = supabase
      .channel(`header-notifications:${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
        void refresh();
      })
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [user, location.pathname]);

  return (
    <header className="sticky top-0 z-40 glass-effect border-b border-neutral-200 dark:border-neutral-800">
      <div className="flex items-center justify-between h-16 px-4 lg:px-8">
        <h2 className="min-w-0 truncate text-lg font-bold text-neutral-900 dark:text-neutral-100">{title}</h2>

        <div className="flex items-center gap-2">
          <Link
            to="/downloads"
            className="hidden sm:flex items-center justify-center w-10 h-10 rounded-xl text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800 transition-all duration-200"
            aria-label="المحفوظات والتنزيلات"
            title="المحفوظات والتنزيلات"
          >
            <Download size={20} />
          </Link>
          <Link
            to="/notifications"
            className="relative flex items-center justify-center w-10 h-10 rounded-xl text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800 transition-all duration-200"
            aria-label={unreadCount > 0 ? `الإشعارات، ${unreadCount} غير مقروء` : 'الإشعارات'}
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-accent-500 text-white text-[10px] font-bold leading-4 text-center">
                {unreadCount > 9 ? '٩+' : unreadCount.toLocaleString('ar-EG')}
              </span>
            )}
          </Link>
          <Link
            to="/profile"
            className="flex items-center justify-center w-10 h-10 rounded-xl text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800 transition-all duration-200"
            aria-label="الملف الشخصي"
          >
            <UserRound size={20} />
          </Link>
          <Link
            to="/settings"
            className="flex items-center justify-center w-10 h-10 rounded-xl text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800 transition-all duration-200"
            aria-label="الإعدادات"
          >
            <Settings2 size={20} />
          </Link>
          {isAdmin && (
            <Link
              to="/admin"
              className="flex items-center justify-center w-10 h-10 rounded-xl text-primary-600 hover:bg-primary-50 dark:text-primary-300 dark:hover:bg-primary-900/20 transition-all duration-200"
              aria-label="لوحة الأدمن"
              title="لوحة الأدمن"
            >
              <ShieldCheck size={20} />
            </Link>
          )}
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center w-10 h-10 rounded-xl text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800 transition-all duration-200"
            aria-label="تبديل الوضع"
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
        </div>
      </div>
    </header>
  );
}
