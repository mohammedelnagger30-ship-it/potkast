import { NavLink } from 'react-router-dom';
import { navItems, mobileNavItems } from './navConfig';

export function BottomNav() {
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 glass-effect border-t border-neutral-200 dark:border-neutral-800 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16">
        {mobileNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex flex-1 min-w-0 flex-col items-center justify-center gap-0.5 px-1 py-1.5 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-neutral-400 dark:text-neutral-500'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={`flex items-center justify-center w-9 h-7 rounded-full transition-all duration-200 ${
                    isActive ? 'bg-primary-100 dark:bg-primary-900/40' : ''
                  }`}
                >
                  <item.icon size={20} />
                </div>
                <span className="text-[10px] font-semibold">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
