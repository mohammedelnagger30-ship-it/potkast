import { Moon, Sun, Bell, Download, Settings2, UserRound } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useUpdate } from '@/context/UpdateContext';
import { Link } from 'react-router-dom';

export function Header({ title }: { title: string }) {
  const { theme, toggleTheme } = useTheme();
  const { available, dismissed } = useUpdate();
  const hasUpdate = available && !dismissed;

  return (
    <header className="sticky top-0 z-40 glass-effect border-b border-neutral-200 dark:border-neutral-800">
      <div className="flex items-center justify-between h-16 px-4 lg:px-8">
        <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">{title}</h2>

        <div className="flex items-center gap-2">
          <Link
            to="/updates"
            className="relative flex items-center justify-center w-10 h-10 rounded-xl text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800 transition-all duration-200"
            aria-label={hasUpdate ? 'تحديث متاح للتطبيق' : 'تحديثات التطبيق'}
            title={hasUpdate ? 'نسخة جديدة متاحة' : 'تحديثات التطبيق'}
          >
            <Download size={20} />
            {hasUpdate && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-accent-500 rounded-full ring-2 ring-white dark:ring-neutral-900 animate-pulse" />
            )}
          </Link>
          <Link
            to="/notifications"
            className="relative flex items-center justify-center w-10 h-10 rounded-xl text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800 transition-all duration-200"
            aria-label="الإشعارات"
          >
            <Bell size={20} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-accent-500 rounded-full" />
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
