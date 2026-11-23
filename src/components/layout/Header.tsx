import { Moon, Sun, Bell, Download, Settings2, UserRound } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { Link } from 'react-router-dom';

export function Header({ title }: { title: string }) {
  const { theme, toggleTheme } = useTheme();

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
