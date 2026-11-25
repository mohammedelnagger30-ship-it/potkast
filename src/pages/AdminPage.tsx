import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity as ActivityIcon,
  Award,
  Ban,
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  Flame,
  Headphones,
  Layers,
  Mail,
  Mic,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Target,
  Trash2,
  Trophy,
  UserCheck,
  UserPlus,
  Users,
  X,
  XCircle,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Layout } from '@/components/layout';
import { Badge, Button, Card, CardHeader, ProgressBar } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { formatListeningTime, getLevelInfo, xpProgressInLevel } from '@/lib/gamification';
import {
  adminActions,
  clearAdminAccessCache,
  getAdminDashboard,
  type AdminDashboard,
} from '@/lib/admin';

type Tab = 'overview' | 'users' | 'activity' | 'content' | 'tools';
type UserFilter = 'all' | 'onboarded' | 'new' | 'active' | 'admins' | 'banned';
type UserSort = 'xp' | 'recent' | 'joined' | 'listening';

const nf = (value: number) => Number(value || 0).toLocaleString('ar-EG');
const dateOnly = (value: string | null) =>
  value
    ? new Date(value).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';
const dateTime = (value: string | null) =>
  value
    ? new Date(value).toLocaleString('ar-EG', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
      })
    : '—';
const tooltipStyle = {
  backgroundColor: '#1e293b',
  border: 'none',
  borderRadius: '12px',
  fontSize: '13px',
  color: '#fff',
};

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'primary',
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  tone?: 'primary' | 'accent' | 'success' | 'warning';
}) {
  const tones = {
    primary: 'bg-primary-100 text-primary-600 dark:bg-primary-900/40 dark:text-primary-300',
    accent: 'bg-accent-100 text-accent-600 dark:bg-accent-900/40 dark:text-accent-300',
    success: 'bg-success-100 text-success-600 dark:bg-success-900/40 dark:text-success-300',
    warning: 'bg-warning-100 text-warning-600 dark:bg-warning-900/40 dark:text-warning-300',
  };
  return (
    <Card className="flex items-start gap-3">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${tones[tone]}`}>
        <Icon size={22} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-neutral-500 dark:text-neutral-400">{label}</p>
        <p className="text-2xl font-extrabold text-neutral-900 dark:text-white leading-tight mt-0.5">
          {typeof value === 'number' ? nf(value) : value}
        </p>
        {hint && <p className="text-[11px] text-neutral-400 mt-1">{hint}</p>}
      </div>
    </Card>
  );
}

function InfoTile({
  label,
  value,
  icon: Icon,
  mono = false,
}: {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  mono?: boolean;
}) {
  return (
    <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-700/60 p-3 min-w-0">
      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
        {Icon && <Icon size={13} className="flex-shrink-0" />}
        <span className="truncate">{label}</span>
      </p>
      <p
        className={`font-bold text-neutral-900 dark:text-white mt-1 break-words ${
          mono ? 'text-[11px] direction-ltr text-right' : 'text-sm'
        }`}
        dir={mono ? 'ltr' : undefined}
      >
        {typeof value === 'number' ? nf(value) : value}
      </p>
    </div>
  );
}

export default function AdminPage() {
  const { user } = useAuth();
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<UserFilter>('all');
  const [sort, setSort] = useState<UserSort>('xp');
  const [visible, setVisible] = useState(50);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const detailInitRef = useRef<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [broadcast, setBroadcast] = useState({ title: '', body: '', link: '' });
  const [newAdmin, setNewAdmin] = useState('');
  const [xpDraft, setXpDraft] = useState('');
  const [notifyDraft, setNotifyDraft] = useState({ title: '', body: '' });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getAdminDashboard());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر تحميل بيانات الأدمن');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const runAction = async (key: string, action: () => Promise<unknown>, closeDetail = false) => {
    setBusy(key);
    try {
      const result = await action();
      setData(await getAdminDashboard());
      setToast(typeof result === 'string' && result ? result : 'تم تنفيذ الإجراء بنجاح');
      if (closeDetail) {
        setSelectedId(null);
        detailInitRef.current = null;
      }
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'حدث خطأ أثناء التنفيذ');
    } finally {
      setBusy(null);
    }
  };

  const users = useMemo(() => data?.users ?? [], [data]);
  const selected = users.find((u) => u.id === selectedId) ?? null;

  useEffect(() => {
    if (!selected || detailInitRef.current === selected.id) return;
    detailInitRef.current = selected.id;
    setXpDraft(String(selected.xp));
    setNotifyDraft({ title: '', body: '' });
  }, [selected]);

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = users.filter((u) => {
      if (q && !u.email.toLowerCase().includes(q) && !u.name.toLowerCase().includes(q) && !u.id.includes(q)) {
        return false;
      }
      switch (filter) {
        case 'onboarded': return u.onboarded;
        case 'new': return Date.now() - new Date(u.createdAt).getTime() < 7 * 86400000;
        case 'active': return !!u.lastActiveAt && Date.now() - new Date(u.lastActiveAt).getTime() < 7 * 86400000;
        case 'admins': return u.isAdmin;
        case 'banned': return u.banned;
        default: return true;
      }
    });
    list = [...list].sort((a, b) => {
      if (sort === 'recent') return (b.lastActiveAt || '').localeCompare(a.lastActiveAt || '');
      if (sort === 'joined') return (b.createdAt || '').localeCompare(a.createdAt || '');
      if (sort === 'listening') return b.listeningSeconds - a.listeningSeconds;
      return b.xp - a.xp;
    });
    return list;
  }, [users, query, filter, sort]);

  const exportCsv = () => {
    const cells = (value: string | number) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const header = ['الإيميل', 'الاسم', 'المستوى', 'النقاط', 'السلسلة', 'دقائق الاستماع', 'المهام المكتملة', 'آخر نشاط', 'تاريخ التسجيل'];
    const rows = filteredUsers.map((u) => [
      u.email, u.name, u.level, u.xp, u.streak,
      Math.round(u.listeningSeconds / 60), u.missionsCompleted,
      dateTime(u.lastActiveAt), dateOnly(u.createdAt),
    ]);
    const csv = `\uFEFF${[header, ...rows].map((row) => row.map(cells).join(',')).join('\r\n')}`;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `sada-users-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setToast(`تم تصدير ${nf(filteredUsers.length)} مستخدم`);
  };

  if (loading && !data) {
    return (
      <Layout title="لوحة الأدمن">
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 rounded-full border-4 border-primary-600 border-t-transparent animate-spin" />
        </div>
      </Layout>
    );
  }

  if (error && !data) {
    return (
      <Layout title="لوحة الأدمن">
        <Card className="text-center py-12">
          <XCircle size={40} className="mx-auto text-error-500 mb-3" />
          <p className="font-bold text-neutral-900 dark:text-white mb-2">مش قادر أفتح لوحة الأدمن</p>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-5">{error}</p>
          <Button onClick={() => void load()}>إعادة المحاولة</Button>
        </Card>
      </Layout>
    );
  }

  if (!data) return null;
  const totals = data.totals;
  const onboardingRate = totals.profiles ? Math.round((totals.onboarded / totals.profiles) * 100) : 0;
  const activityData = data.activity;
  const levelData = data.levels.filter((l) => l.count > 0).map((l) => ({ ...l, label: `L${l.level}` }));

  const tabs: { key: Tab; label: string; icon: LucideIcon }[] = [
    { key: 'overview', label: 'نظرة عامة', icon: ActivityIcon },
    { key: 'users', label: 'المستخدمون', icon: Users },
    { key: 'activity', label: 'النشاط', icon: Flame },
    { key: 'content', label: 'المحتوى', icon: Layers },
    { key: 'tools', label: 'الأدمن والإشعارات', icon: ShieldCheck },
  ];

  return (
    <Layout title="لوحة التحكم — الأدمن" wide>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck size={24} className="text-primary-600" />
            <h1 className="text-2xl font-extrabold text-neutral-900 dark:text-white">مرحباً أيها المدير</h1>
          </div>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            كل بيانات الموقع في مكان واحد — آخر تحديث {dateTime(data.generatedAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" leftIcon={<Download size={15} />} onClick={exportCsv}>
            تصدير الإيميلات
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<RefreshCw size={15} className={loading ? 'animate-spin' : ''} />}
            onClick={() => void load()}
            disabled={loading}
          >
            تحديث
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-3 mb-5">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
              tab === key
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-800 hover:border-primary-400'
            }`}
          >
            <Icon size={17} />
            {label}
          </button>
        ))}
      </div>

      {toast && (
        <div className="mb-5 flex items-center gap-2 rounded-xl bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-800 px-4 py-3 text-sm font-semibold text-primary-800 dark:text-primary-200">
          <CheckCircle2 size={18} />
          {toast}
        </div>
      )}

      {/* ================= Overview ================= */}
      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard icon={Users} label="إجمالي المستخدمين" value={totals.users} hint={`${nf(totals.profiles)} ملف شخصي`} />
            <StatCard icon={UserCheck} label="نشط اليوم" value={totals.activeToday} hint={`${nf(totals.activeWeek)} خلال 7 أيام`} tone="success" />
            <StatCard icon={Headphones} label="ساعات الاستماع" value={totals.listeningHours} hint={`${nf(totals.episodesCompleted)} حلقة مكتملة`} tone="accent" />
            <StatCard icon={Target} label="المهام المكتملة" value={totals.missionsCompleted} hint={`إجمالي XP: ${nf(totals.totalXp)}`} tone="warning" />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <InfoTile label="أكملوا الـ onboarding" value={`${onboardingRate}%`} icon={UserCheck} />
            <InfoTile label="أدمن نشط" value={totals.admins} icon={ShieldCheck} />
            <InfoTile label="بودكاست / حلقات" value={`${nf(totals.podcasts)} / ${nf(totals.episodes)}`} icon={Mic} />
            <InfoTile label="مقدمون / تصنيفات" value={`${nf(totals.hosts)} / ${nf(totals.categories)}`} icon={Award} />
          </div>

          <Card>
            <CardHeader title="نشاط آخر 30 يوماً" subtitle="استماع، مهام مكتملة، ومستخدمون نشطون" />
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activityData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                  <defs>
                    <linearGradient id="listensFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0F766E" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#0F766E" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="usersFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D4A017" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#D4A017" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-neutral-200 dark:text-neutral-800" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={4} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#94A3B8' }} />
                  <Area type="monotone" dataKey="listens" name="استماع" stroke="#0F766E" strokeWidth={2} fill="url(#listensFill)" />
                  <Area type="monotone" dataKey="activeUsers" name="مستخدمون نشطون" stroke="#D4A017" strokeWidth={2} fill="url(#usersFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid lg:grid-cols-2 gap-5">
            <Card>
              <CardHeader title="توزيع المستويات" subtitle="عدد المستخدمين في كل مستوى" />
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={levelData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-neutral-200 dark:text-neutral-800" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} width={28} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#94A3B8' }} />
                    <Bar dataKey="count" name="مستخدمون" fill="#0F766E" radius={[5, 5, 0, 0]} maxBarSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <CardHeader title="الاهتمامات الأكثر اختياراً" subtitle="من بيانات الـ onboarding" />
              <div className="space-y-3">
                {data.interests.length === 0 && (
                  <p className="text-sm text-neutral-400">لا توجد اهتمامات مسجّلة بعد.</p>
                )}
                {data.interests.slice(0, 8).map((interest) => {
                  const max = data.interests[0]?.count || 1;
                  return (
                    <div key={interest.name}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-neutral-700 dark:text-neutral-300">{interest.name}</span>
                        <span className="text-neutral-400">{nf(interest.count)}</span>
                      </div>
                      <ProgressBar value={interest.count} max={max} size="sm" variant="accent" />
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          <Card>
            <CardHeader title="آخر النشاطات" subtitle="أحدث حركة في التطبيق" action={<Button size="sm" variant="ghost" onClick={() => setTab('activity')}>عرض الكل</Button>} />
            <RecentList events={data.recentActivity.slice(0, 8)} />
          </Card>
        </div>
      )}

      {/* ================= Users ================= */}
      {tab === 'users' && (
        <div className="space-y-5">
          <Card>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[220px]">
                <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setVisible(50); }}
                  placeholder="ابحث بالإيميل أو الاسم أو المعرّف..."
                  className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 py-2.5 pr-10 pl-3 text-sm text-neutral-900 dark:text-white outline-none focus:border-primary-500"
                />
              </div>
              <select
                value={filter}
                onChange={(e) => { setFilter(e.target.value as UserFilter); setVisible(50); }}
                className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2.5 text-sm text-neutral-700 dark:text-neutral-200"
              >
                <option value="all">كل المستخدمين</option>
                <option value="onboarded">أكملوا التسجيل</option>
                <option value="new">جدد (7 أيام)</option>
                <option value="active">نشطون (7 أيام)</option>
                <option value="admins">الأدمن</option>
                <option value="banned">محظورون</option>
              </select>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as UserSort)}
                className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2.5 text-sm text-neutral-700 dark:text-neutral-200"
              >
                <option value="xp">الأعلى XP</option>
                <option value="recent">الأحدث نشاطاً</option>
                <option value="joined">الأحدث تسجيلاً</option>
                <option value="listening">الأكثر استماعاً</option>
              </select>
            </div>
            <p className="text-xs text-neutral-400 mt-3">
              عرض {nf(Math.min(visible, filteredUsers.length))} من {nf(filteredUsers.length)} مستخدم
            </p>
          </Card>

          <Card className="overflow-x-auto p-0">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 text-right text-xs text-neutral-500 dark:text-neutral-400">
                  <th className="px-4 py-3 font-semibold">المستخدم</th>
                  <th className="px-3 py-3 font-semibold">المستوى</th>
                  <th className="px-3 py-3 font-semibold">XP</th>
                  <th className="px-3 py-3 font-semibold">السلسلة</th>
                  <th className="px-3 py-3 font-semibold">الاستماع</th>
                  <th className="px-3 py-3 font-semibold">المهام</th>
                  <th className="px-3 py-3 font-semibold">آخر نشاط</th>
                  <th className="px-3 py-3 font-semibold">التسجيل</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filteredUsers.slice(0, visible).map((u) => {
                  const level = getLevelInfo(u.xp);
                  return (
                    <tr
                      key={u.id}
                      onClick={() => setSelectedId(u.id)}
                      className="border-b border-neutral-100 dark:border-neutral-800/70 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 flex items-center justify-center font-bold flex-shrink-0 overflow-hidden">
                            {u.avatar ? <img src={u.avatar} alt="" className="w-full h-full object-cover" /> : u.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-neutral-900 dark:text-white truncate max-w-[160px]">{u.name}</p>
                            <p className="text-[11px] text-neutral-400 truncate max-w-[190px] direction-ltr text-right" dir="ltr">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <Badge variant={u.isAdmin ? 'accent' : 'primary'} size="sm">
                          {u.isAdmin ? 'أدمن' : `${level.level} · ${level.title}`}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 font-semibold text-neutral-800 dark:text-neutral-200">{nf(u.xp)}</td>
                      <td className="px-3 py-3">
                        <span className="flex items-center gap-1 text-orange-500"><Flame size={14} />{nf(u.streak)}</span>
                      </td>
                      <td className="px-3 py-3 text-neutral-600 dark:text-neutral-300">{formatListeningTime(u.listeningSeconds)}</td>
                      <td className="px-3 py-3 text-neutral-600 dark:text-neutral-300">{nf(u.missionsCompleted)}</td>
                      <td className="px-3 py-3 text-xs text-neutral-500">{dateTime(u.lastActiveAt)}</td>
                      <td className="px-3 py-3 text-xs text-neutral-500">{dateOnly(u.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setSelectedId(u.id); }}
                            className="inline-flex items-center gap-1 text-primary-600 text-xs font-bold hover:underline"
                          >
                            <Eye size={15} /> تفاصيل
                          </button>
                          <button
                            type="button"
                            title={
                              u.id === user?.id
                                ? 'لا يمكنك حذف حسابك أنت'
                                : u.isAdmin
                                  ? 'لا يمكن حذف حساب أدمن'
                                  : `حذف ${u.email}`
                            }
                            disabled={!!busy || u.id === user?.id || u.isAdmin}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!window.confirm(`سيتم حذف حساب ${u.email} وكل بياناته نهائياً. لا يمكن التراجع. متابعة؟`)) return;
                              void runAction(`delete-${u.id}`, async () => {
                                await adminActions.deleteUser(u.id);
                                return `تم حذف حساب ${u.email}`;
                              });
                            }}
                            className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-error-500 hover:bg-error-50 dark:hover:bg-error-900/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            aria-label={`حذف ${u.email}`}
                          >
                            {busy === `delete-${u.id}` ? (
                              <RefreshCw size={14} className="animate-spin" />
                            ) : (
                              <Trash2 size={15} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredUsers.length === 0 && (
              <p className="text-center py-10 text-sm text-neutral-400">لا يوجد مستخدمون مطابقون.</p>
            )}
          </Card>

          {visible < filteredUsers.length && (
            <div className="text-center">
              <Button variant="secondary" onClick={() => setVisible((v) => v + 50)}>
                عرض المزيد ({nf(filteredUsers.length - visible)} متبقٍ)
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ================= Activity ================= */}
      {tab === 'activity' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard icon={Flame} label="نشط اليوم" value={totals.activeToday} tone="warning" />
            <StatCard icon={CalendarDays} label="نشط خلال أسبوع" value={totals.activeWeek} tone="success" />
            <StatCard icon={BookOpen} label="يوميات مكتوبة" value={totals.journalEntries} />
            <StatCard icon={Bell} label="إشعارات مُرسلة" value={totals.notifications} tone="accent" />
          </div>

          <Card>
            <CardHeader title="النشاط اليومي" subtitle="آخر 30 يوماً — استماع ومهام ومستخدمون" />
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activityData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-neutral-200 dark:text-neutral-800" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={3} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#94A3B8' }} />
                  <Area type="monotone" dataKey="listens" name="حلقات مستمعة" stroke="#0F766E" strokeWidth={2} fill="#0F766E" fillOpacity={0.15} />
                  <Area type="monotone" dataKey="missions" name="مهام مكتملة" stroke="#10B981" strokeWidth={2} fill="#10B981" fillOpacity={0.12} />
                  <Area type="monotone" dataKey="activeUsers" name="مستخدمون نشطون" stroke="#D4A017" strokeWidth={2} fill="#D4A017" fillOpacity={0.1} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid lg:grid-cols-2 gap-5">
            <Card>
              <CardHeader title="أكثر المستخدمين تقدّماً" subtitle="ترتيب حسب النقاط" />
              <div className="space-y-3">
                {users.slice(0, 10).map((u, i) => (
                  <button
                    key={u.id}
                    onClick={() => setSelectedId(u.id)}
                    className="w-full flex items-center gap-3 text-right hover:bg-neutral-50 dark:hover:bg-neutral-800/40 rounded-lg p-1.5 transition-colors"
                  >
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${i < 3 ? 'bg-accent-100 text-accent-700' : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'}`}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-neutral-900 dark:text-white truncate">{u.name}</p>
                      <p className="text-[11px] text-neutral-400 truncate" dir="ltr">{u.email}</p>
                    </div>
                    <div className="w-20">
                      <ProgressBar value={xpProgressInLevel(u.xp).percent} size="sm" />
                    </div>
                    <span className="text-xs font-bold text-primary-600 w-14 text-left">{nf(u.xp)}</span>
                  </button>
                ))}
              </div>
            </Card>

            <Card>
              <CardHeader title="سجل النشاط" subtitle="آخر 25 حدثاً" />
              <RecentList events={data.recentActivity} />
            </Card>
          </div>
        </div>
      )}

      {/* ================= Content ================= */}
      {tab === 'content' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard icon={Mic} label="البودكاستات" value={totals.podcasts} />
            <StatCard icon={Headphones} label="الحلقات" value={totals.episodes} tone="accent" />
            <StatCard icon={Users} label="المقدمون" value={totals.hosts} tone="success" />
            <StatCard icon={Layers} label="التصنيفات" value={totals.categories} tone="warning" />
          </div>

          <Card>
            <CardHeader title="الأكثر استماعاً" subtitle="حسب عدد المشاهدات المسجل" />
            <div className="space-y-2">
              {data.topPodcasts.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3 rounded-xl border border-neutral-100 dark:border-neutral-800 p-2">
                  <span className="w-7 text-center text-sm font-bold text-neutral-400">{i + 1}</span>
                  {p.coverUrl ? (
                    <img src={p.coverUrl} alt="" className="w-12 h-12 rounded-lg object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-primary-600"><Mic size={20} /></div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-neutral-900 dark:text-white truncate">{p.title}</p>
                    <p className="text-[11px] text-neutral-400 truncate">{p.hostName} · {nf(p.episodes)} حلقة</p>
                  </div>
                  <Badge variant="neutral" size="sm">{nf(p.plays)} مشاهدة</Badge>
                </div>
              ))}
              {data.topPodcasts.length === 0 && <p className="text-sm text-neutral-400 py-4 text-center">لا توجد بيانات.</p>}
            </div>
          </Card>

          <Card>
            <CardHeader title="المقدمون" subtitle="مرتبين بعدد المتابعين داخل التطبيق" />
            <div className="grid sm:grid-cols-2 gap-3">
              {data.topHosts.map((h) => (
                <div key={h.id} className="flex items-center gap-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 p-3">
                  {h.photoUrl ? (
                    <img src={h.photoUrl} alt="" className="w-11 h-11 rounded-full object-cover" />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold">{h.name.charAt(0)}</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-neutral-900 dark:text-white truncate">{h.name}</p>
                    <p className="text-[11px] text-neutral-400 truncate">{h.specialty || 'مقدم بودكاست'}</p>
                  </div>
                  <Badge variant="primary" size="sm">{nf(h.followers)} متابع</Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ================= Tools ================= */}
      {tab === 'tools' && (
        <div className="space-y-6">
          <Card>
            <CardHeader title="إرسال إشعار لكل المستخدمين" subtitle="يظهر لكل حساب في مركز الإشعارات" />
            <div className="space-y-3">
              <input
                value={broadcast.title}
                onChange={(e) => setBroadcast({ ...broadcast, title: e.target.value })}
                placeholder="عنوان الإشعار"
                className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-4 py-2.5 text-sm outline-none focus:border-primary-500"
              />
              <textarea
                value={broadcast.body}
                onChange={(e) => setBroadcast({ ...broadcast, body: e.target.value })}
                placeholder="نص الإشعار"
                rows={3}
                className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-4 py-2.5 text-sm outline-none focus:border-primary-500 resize-none"
              />
              <input
                value={broadcast.link}
                onChange={(e) => setBroadcast({ ...broadcast, link: e.target.value })}
                placeholder="رابط اختياري (مثال: /updates)"
                className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-4 py-2.5 text-sm outline-none focus:border-primary-500"
              />
              <Button
                leftIcon={<Send size={16} />}
                disabled={!!busy || !broadcast.title.trim()}
                onClick={() => void runAction('broadcast', async () => {
                  const result = await adminActions.broadcast(broadcast.title, broadcast.body, broadcast.link);
                  setBroadcast({ title: '', body: '', link: '' });
                  return `تم الإرسال إلى ${nf(result.sent)} مستخدم`;
                })}
              >
                {busy === 'broadcast' ? 'جارٍ الإرسال...' : 'إرسال للجميع'}
              </Button>
            </div>
          </Card>

          <Card>
            <CardHeader title="إيميلات الأدمن" subtitle="هؤلاء فقط يقدروا يفتحوا صفحة الأدمن" />
            <div className="space-y-2 mb-4">
              {data.admins.map((a) => (
                <div key={a.email} className="flex flex-wrap items-center gap-3 rounded-xl border border-neutral-100 dark:border-neutral-800 p-3">
                  <ShieldCheck size={18} className={a.active ? 'text-primary-600' : 'text-neutral-400'} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-neutral-900 dark:text-white" dir="ltr">{a.email}</p>
                    <p className="text-[11px] text-neutral-400">{a.label} · أضيف {dateOnly(a.createdAt)}</p>
                  </div>
                  <Badge variant={a.active ? 'success' : 'neutral'} size="sm">{a.active ? 'نشط' : 'موقوف'}</Badge>
                  <Button
                    size="sm"
                    variant={a.active ? 'secondary' : 'outline'}
                    onClick={() => void runAction(`admin-${a.email}`, async () => {
                      await adminActions.setAdminEmail(a.email, !a.active);
                      clearAdminAccessCache();
                    })}
                    disabled={!!busy}
                  >
                    {a.active ? 'إيقاف' : 'تفعيل'}
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                value={newAdmin}
                onChange={(e) => setNewAdmin(e.target.value)}
                placeholder="إيميل أدمن جديد"
                type="email"
                className="flex-1 min-w-[220px] rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-4 py-2.5 text-sm outline-none focus:border-primary-500"
              />
              <Button
                leftIcon={<UserPlus size={16} />}
                disabled={!!busy || !newAdmin.trim()}
                onClick={() => void runAction('add-admin', async () => {
                  await adminActions.setAdminEmail(newAdmin.trim(), true);
                  setNewAdmin('');
                })}
              >
                إضافة أدمن
              </Button>
            </div>
          </Card>

          <Card>
            <CardHeader title="ملاحظات أمنية" subtitle="مهمة عشان حسابك يفضل آمن" />
            <div className="space-y-2 text-sm text-neutral-600 dark:text-neutral-300">
              <p className="flex items-start gap-2"><CheckCircle2 size={17} className="text-success-500 mt-0.5 flex-shrink-0" /> الصلاحية مرتبطة بالإيميل الموجود في حساب Supabase، مش بأي بيانات قابلة للتعديل من التطبيق.</p>
              <p className="flex items-start gap-2"><CheckCircle2 size={17} className="text-success-500 mt-0.5 flex-shrink-0" /> كل إجراءات الأدمن بتتحقق من الصلاحية على السيرفر قبل التنفيذ.</p>
              <p className="flex items-start gap-2"><CheckCircle2 size={17} className="text-success-500 mt-0.5 flex-shrink-0" /> غير كلمة مرور الأدمن من Supabase Auth، ويفضّل تفعيل Email Confirmation.</p>
              <p className="flex items-start gap-2"><ShieldCheck size={17} className="text-primary-500 mt-0.5 flex-shrink-0" /> الحساب الحالي: <span dir="ltr" className="font-semibold">{user?.email}</span></p>
            </div>
          </Card>
        </div>
      )}

      {/* ================= User detail ================= */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
          onClick={() => { setSelectedId(null); detailInitRef.current = null; }}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="flex w-full max-w-4xl max-h-[100dvh] sm:max-h-[92dvh] flex-col overflow-hidden rounded-t-2xl sm:rounded-2xl bg-white dark:bg-neutral-900 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sticky header: identity + badges + close */}
            <div className="flex flex-shrink-0 items-start gap-3 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-4 sm:px-6">
              <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 flex items-center justify-center font-extrabold overflow-hidden flex-shrink-0">
                {selected.avatar ? <img src={selected.avatar} alt="" className="w-full h-full object-cover" /> : selected.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-extrabold text-neutral-900 dark:text-white">{selected.name}</h2>
                  {selected.isAdmin && <Badge variant="accent" size="sm">أدمن</Badge>}
                  {selected.banned && <Badge variant="error" size="sm">محظور</Badge>}
                  {!selected.emailConfirmed && <Badge variant="warning" size="sm">إيميل غير مؤكد</Badge>}
                </div>
                <p className="text-xs text-neutral-400 mt-0.5 truncate" dir="ltr">{selected.email}</p>
              </div>
              <button
                onClick={() => { setSelectedId(null); detailInitRef.current = null; }}
                aria-label="إغلاق التفاصيل"
                className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 flex-shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6 space-y-5">
              {/* Progress */}
              <Card className="p-4 sm:p-5">
                <CardHeader
                  title={`المستوى ${selected.level} — ${getLevelInfo(selected.xp).title}`}
                  subtitle={`${nf(selected.xp)} نقطة`}
                />
                <ProgressBar value={xpProgressInLevel(selected.xp).percent} showLabel size="lg" />
                <p className="text-xs text-neutral-400 mt-2">
                  {nf(xpProgressInLevel(selected.xp).current)} / {nf(xpProgressInLevel(selected.xp).needed)} نقطة للمستوى التالي
                </p>
              </Card>

              {/* Full data grid */}
              <section>
                <h3 className="font-bold text-neutral-900 dark:text-white mb-3">كل بيانات المستخدم</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  <InfoTile label="المعرّف" value={selected.id} icon={ShieldCheck} mono />
                  <InfoTile label="تاريخ التسجيل" value={dateOnly(selected.createdAt)} icon={CalendarDays} />
                  <InfoTile label="آخر دخول" value={dateTime(selected.lastSignInAt)} icon={Clock} />
                  <InfoTile label="آخر نشاط" value={dateTime(selected.lastActiveAt)} icon={ActivityIcon} />
                  <InfoTile label="أكمل الـ onboarding" value={selected.onboarded ? 'نعم' : 'لا'} icon={UserCheck} />
                  <InfoTile label="الهدف اليومي" value={`${selected.dailyGoalMinutes} دقيقة`} icon={Target} />
                  <InfoTile label="وقت التذكير" value={selected.reminderTime} icon={Bell} />
                  <InfoTile label="سلسلة حالية" value={selected.streak} icon={Flame} />
                  <InfoTile label="أطول سلسلة" value={selected.longestStreak} icon={Trophy} />
                  <InfoTile label="وقت الاستماع" value={formatListeningTime(selected.listeningSeconds)} icon={Headphones} />
                  <InfoTile label="حلقات بدأها" value={selected.episodesStarted} icon={Mic} />
                  <InfoTile label="حلقات مكتملة" value={selected.episodesCompleted} icon={CheckCircle2} />
                  <InfoTile label="مهام مكتملة" value={selected.missionsCompleted} icon={Target} />
                  <InfoTile label="مهام معلّقة" value={selected.missionsPending} icon={Clock} />
                  <InfoTile label="بودكاستات مفضلة" value={selected.podcastFavorites} icon={Headphones} />
                  <InfoTile label="حلقات مفضلة" value={selected.episodeFavorites} icon={BookOpen} />
                  <InfoTile label="مقدمون متابعون" value={selected.hostsFollowed} icon={Users} />
                  <InfoTile label="إنجازات" value={selected.achievements} icon={Award} />
                  <InfoTile label="يوميات" value={selected.journalEntries} icon={BookOpen} />
                  <InfoTile label="دورات عجلة الحياة" value={selected.wheelSpins} icon={Zap} />
                  <InfoTile label="مسارات ملتحق بها" value={selected.pathsEnrolled} icon={Layers} />
                  <InfoTile label="إشارات مرجعية" value={selected.bookmarks} icon={BookOpen} />
                  <InfoTile label="ملاحظات حلقات" value={selected.episodeNotes} icon={Mail} />
                  <InfoTile label="إشعارات" value={selected.notifications} icon={Bell} />
                </div>
                {selected.interests.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {selected.interests.map((interest) => (
                      <Badge key={interest} variant="neutral" size="sm">{interest}</Badge>
                    ))}
                  </div>
                )}
              </section>

              {/* Actions */}
              <section className="border-t border-neutral-200 dark:border-neutral-800 pt-5 space-y-4">
                <h3 className="font-bold text-neutral-900 dark:text-white">إجراءات إدارية</h3>
                <div className="grid gap-3 lg:grid-cols-3">
                  <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-3 space-y-2 min-w-0">
                    <p className="text-sm font-bold flex items-center gap-2"><Send size={16} className="text-primary-600 flex-shrink-0" /> إرسال إشعار لهذا المستخدم</p>
                    <input
                      value={notifyDraft.title}
                      onChange={(e) => setNotifyDraft({ ...notifyDraft, title: e.target.value })}
                      placeholder="العنوان"
                      className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-primary-500"
                    />
                    <input
                      value={notifyDraft.body}
                      onChange={(e) => setNotifyDraft({ ...notifyDraft, body: e.target.value })}
                      placeholder="النص"
                      className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-primary-500"
                    />
                    <Button
                      size="sm"
                      disabled={!!busy || !notifyDraft.title.trim()}
                      onClick={() => void runAction('notify', () => adminActions.sendNotification(selected.id, notifyDraft.title, notifyDraft.body))}
                    >
                      إرسال
                    </Button>
                  </div>

                  <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-3 space-y-2 min-w-0">
                    <p className="text-sm font-bold flex items-center gap-2"><Zap size={16} className="text-accent-600 flex-shrink-0" /> تعديل النقاط (المستوى)</p>
                    <input
                      type="number"
                      min={0}
                      value={xpDraft}
                      onChange={(e) => setXpDraft(e.target.value)}
                      className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-primary-500"
                    />
                    <Button
                      size="sm"
                      variant="accent"
                      disabled={!!busy || xpDraft === ''}
                      onClick={() => void runAction('xp', () => adminActions.setXp(selected.id, Math.max(0, Number(xpDraft) || 0)))}
                    >
                      حفظ النقاط
                    </Button>
                  </div>

                  <div className="rounded-xl border border-error-200 dark:border-error-900/50 bg-error-50/50 dark:bg-error-900/10 p-3 space-y-2 min-w-0">
                    <p className="text-sm font-bold flex items-center gap-2 text-error-700 dark:text-error-300">
                      <Ban size={16} className="flex-shrink-0" /> إجراءات الحساب
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        leftIcon={selected.banned ? <CheckCircle2 size={15} /> : <Ban size={15} />}
                        disabled={!!busy}
                        onClick={() => void runAction('ban', async () => {
                          if (!window.confirm(selected.banned ? 'إلغاء حظر هذا المستخدم؟' : 'حظر هذا المستخدم ومنعه من الدخول؟')) return;
                          await adminActions.setBan(selected.id, !selected.banned);
                        }, true)}
                      >
                        {selected.banned ? 'إلغاء الحظر' : 'حظر المستخدم'}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        leftIcon={<RefreshCw size={15} />}
                        disabled={!!busy}
                        onClick={() => void runAction('reset', async () => {
                          if (!window.confirm('سيتم حذف كل تقدّم هذا المستخدم (استماع، مهام، يوميات، إنجازات...) نهائياً. متابعة؟')) return;
                          await adminActions.resetUser(selected.id);
                        }, true)}
                      >
                        تصفير التقدّم
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-error-600"
                        leftIcon={<Trash2 size={15} />}
                        disabled={!!busy}
                        onClick={() => void runAction('delete', async () => {
                          if (!window.confirm('تحذير: سيتم حذف الحساب وكل بياناته نهائياً. لا يمكن التراجع. متابعة؟')) return;
                          await adminActions.deleteUser(selected.id);
                        }, true)}
                      >
                        حذف الحساب
                      </Button>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* Sticky footer */}
            <div className="flex flex-shrink-0 items-center justify-between gap-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/40 px-4 py-3 sm:px-6">
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                بيانات المستخدم محدّثة حتى {dateTime(data.generatedAt)}
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setSelectedId(null); detailInitRef.current = null; }}
              >
                إغلاق
              </Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

function RecentList({ events }: { events: { type: string; label: string; item: string; name: string; email: string; at: string }[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-neutral-400 py-4 text-center">لا توجد نشاطات بعد.</p>;
  }
  return (
    <div className="space-y-2">
      {events.map((event, i) => {
        const Icon = event.type === 'mission' ? Target : event.type === 'listen' ? Headphones : event.type === 'favorite' ? BookOpen : event.type === 'signup' ? UserPlus : BookOpen;
        return (
          <div key={`${event.at}-${i}`} className="flex items-center gap-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/40 p-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/40 text-primary-600 flex items-center justify-center flex-shrink-0">
              <Icon size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200 truncate">
                {event.name} <span className="font-normal text-neutral-400">— {event.label}</span>
              </p>
              <p className="text-[11px] text-neutral-400 truncate">{event.item}</p>
            </div>
            <span className="text-[10px] text-neutral-400 whitespace-nowrap">{dateTime(event.at)}</span>
          </div>
        );
      })}
    </div>
  );
}
