import { Home, Mic, Users, Target, TrendingUp, Bell, User, Download, Settings2, type LucideIcon } from 'lucide-react';

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  { label: 'الرئيسية', path: '/', icon: Home },
  { label: 'البودكاست', path: '/podcasts', icon: Mic },
  { label: 'المقدمون', path: '/hosts', icon: Users },
  { label: 'المهام', path: '/missions', icon: Target },
  { label: 'تقدّمي', path: '/progress', icon: TrendingUp },
  { label: 'التنزيلات', path: '/downloads', icon: Download },
  { label: 'الإشعارات', path: '/notifications', icon: Bell },
  { label: 'الملف الشخصي', path: '/profile', icon: User },
  { label: 'الإعدادات', path: '/settings', icon: Settings2 },
];

// Bottom nav fits ~5 items on small screens; the full list lives in the sidebar
const mobilePaths = new Set(['/', '/podcasts', '/hosts', '/missions', '/progress', '/downloads']);

export const mobileNavItems: NavItem[] = navItems.filter((i) => mobilePaths.has(i.path));
