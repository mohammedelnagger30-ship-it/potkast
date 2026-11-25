import { NavLink, useNavigate } from 'react-router-dom';
import { Sparkles, Moon, Sun, LogOut, ShieldCheck } from 'lucide-react';
import { navItems } from './navConfig';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useAdminStatus } from '@/lib/admin';

export function Sidebar() {
  const { theme, toggleTheme } = useTheme();
  const { user, profile, signOut } = useAuth();
  const { isAdmin } = useAdminStatus();
  const navigate = useNavigate();

  const displayName = profile?.name || user?.email?.split('@')[0] || 'مستخدم';
  const initials = displayName.charAt(0);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth', { replace: true });
  };

  return (
    <aside className="hidden lg:flex flex-col w-64 h-screen sticky top-0 border-l border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 h-20 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary-600 text-white shadow-glow">
          <Sparkles size={22} />
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-neutral-900 dark:text-white">Sada</h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">تطوير الذات</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto no-scrollbar">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-base transition-all duration-200 ${
                isActive
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'
              }`
            }
          >
            <item.icon size={22} />
            {item.label}
          </NavLink>
        ))}
        {isAdmin && (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-base transition-all duration-200 ${
                isActive
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-primary-600 hover:bg-primary-50 dark:text-primary-300 dark:hover:bg-primary-900/20'
              }`
            }
          >
            <ShieldCheck size={22} />
            لوحة الأدمن
          </NavLink>
        )}
      </nav>

      {/* User info + actions */}
      <div className="px-3 py-4 border-t border-neutral-200 dark:border-neutral-800 space-y-1">
        <div className="flex items-center gap-3 px-4 py-2">
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-white font-bold text-sm">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-neutral-900 dark:text-white truncate">{displayName}</p>
            <p className="text-xs text-neutral-400 truncate">{user?.email}</p>
          </div>
        </div>

        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-base text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800 transition-all duration-200 w-full"
        >
          {theme === 'light' ? <Moon size={22} /> : <Sun size={22} />}
          {theme === 'light' ? 'الوضع الليلي' : 'الوضع النهاري'}
        </button>

        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-base text-error-600 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-900/20 transition-all duration-200 w-full"
        >
          <LogOut size={22} />
          تسجيل الخروج
        </button>
      </div>
    </aside>
  );
}
