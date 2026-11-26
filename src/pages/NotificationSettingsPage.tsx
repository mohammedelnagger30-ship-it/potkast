import { useEffect, useState, useCallback } from 'react';
import { Layout } from '@/components/layout';
import { Card, CardHeader, Button } from '@/components/ui';
import {
  Bell, BellOff, Lightbulb, Clock, Target, Check, ChevronLeft,
  Send, AlertCircle, Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  ensureNotificationSettings,
  updateNotificationSettings,
  subscribeToPush,
  unsubscribeFromPush,
  createNotification,
  sendTestPush,
  NOTIFICATION_TYPE_OPTIONS,
  type NotificationSettings,
  type NotificationType,
} from '@/lib/notifications';

const interestLabels: Record<string, string> = {
  spiritual: 'روحاني / ديني',
  science: 'العلوم',
  culture: 'ثقافة وأدب',
  health: 'الصحة واللياقة',
  career: 'المسيرة المهنية',
  finance: 'المال والاستثمار',
  relationships: 'العلاقات والأسرة',
  mental: 'الصحة النفسية',
  leadership: 'القيادة',
  technology: 'التقنية',
};

const allInterests = Object.keys(interestLabels);

export default function NotificationSettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pushStatus, setPushStatus] = useState<NotificationPermission>('default');
  const [testSent, setTestSent] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    let s = await ensureNotificationSettings(user.id);
    const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    if (s && s.timezone !== browserZone) {
      await updateNotificationSettings(user.id, { timezone: browserZone });
      s = { ...s, timezone: browserZone };
    }
    setSettings(s);
    if ('Notification' in window) {
      setPushStatus(Notification.permission);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const updateSetting = async (key: keyof NotificationSettings, value: any) => {
    if (!user || !settings) return;
    setSaving(true);
    setSettings({ ...settings, [key]: value });
    await updateNotificationSettings(user.id, { [key]: value } as any);
    setSaving(false);
  };

  const handlePushToggle = async () => {
    if (!user || !settings) return;
    if (settings.push_enabled) {
      await unsubscribeFromPush(user.id);
      setSettings({ ...settings, push_enabled: false });
    } else {
      setSaving(true);
      const success = await subscribeToPush(user.id);
      setSaving(false);
      if (success) {
        setSettings({ ...settings, push_enabled: true });
        if ('Notification' in window) setPushStatus(Notification.permission);
      }
    }
  };

  const toggleCategory = (cat: string) => {
    if (!settings) return;
    const current = settings.categories || [];
    const updated = current.includes(cat)
      ? current.filter((c) => c !== cat)
      : [...current, cat];
    updateSetting('categories', updated);
  };

  const isTypeEnabled = (key: NotificationType): boolean => {
    if (!settings?.types_enabled?.length) return true;
    return settings.types_enabled.includes(key);
  };

  const toggleType = (key: NotificationType) => {
    if (!settings) return;
    const current: NotificationType[] = settings.types_enabled?.length
      ? settings.types_enabled
      : NOTIFICATION_TYPE_OPTIONS.map((option) => option.key);
    const updated = current.includes(key)
      ? current.filter((item) => item !== key)
      : [...current, key];
    updateSetting('types_enabled', updated);
  };

  const sendTestNotification = async () => {
    if (!user) return;
    const delivered = await sendTestPush();
    if (!delivered) {
      await createNotification(
        user.id,
        'tip',
        'إشعار تجريبي',
        'تم تفعيل الإشعارات بنجاح! ستصلك نصائح يومية وتذكيرات مهام هنا.'
      );
    }
    setNotice(delivered ? 'وصل الإشعار التجريبي إلى جهازك وداخل التطبيق' : 'الإشعار التجريبي ظهر داخل التطبيق فقط — راجع إعداد الـ Push من Supabase');
    setTestSent(true);
    setTimeout(() => { setTestSent(false); setNotice(null); }, 5000);
  };

  if (loading) {
    return (
      <Layout title="إعدادات الإشعارات">
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 rounded-full border-4 border-primary-600 border-t-transparent animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="إعدادات الإشعارات">
      {notice && (
        <div className="mb-4 rounded-xl bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-800 px-4 py-3 text-sm font-semibold text-primary-800 dark:text-primary-200">
          {notice}
        </div>
      )}

      {/* Push notification card */}
      <Card className="mb-6">
        <CardHeader
          title="إشعارات الجهاز"
          subtitle="إشعارات حقيقية على المتصفح أو التطبيق المثبّت، حتى لو كانت الصفحة مغلقة"
        />
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                settings?.push_enabled
                  ? 'bg-success-100 dark:bg-success-900/30 text-success-600'
                  : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-400'
              }`}>
                {settings?.push_enabled ? <Bell size={20} /> : <BellOff size={20} />}
              </div>
              <div>
                <p className="font-semibold text-neutral-900 dark:text-white">
                  تفعيل الإشعارات
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {pushStatus === 'denied'
                    ? 'تم رفض الإذن من المتصفح — يرجى تغييره من الإعدادات'
                    : settings?.push_enabled
                    ? 'الإشعارات مفعّلة'
                    : 'اضغط لتفعيل الإشعارات'}
                </p>
              </div>
            </div>
            <button
              onClick={handlePushToggle}
              disabled={saving || pushStatus === 'denied'}
              className={`relative w-12 h-7 rounded-full transition-all ${
                settings?.push_enabled ? 'bg-success-500' : 'bg-neutral-300 dark:bg-neutral-600'
              } ${pushStatus === 'denied' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${
                settings?.push_enabled ? 'left-1' : 'right-1'
              }`} />
            </button>
          </div>

          {pushStatus === 'denied' && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-error-50 dark:bg-error-900/20 text-error-600 dark:text-error-400 text-sm">
              <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
              <p>
                تم رفض إذن الإشعارات في المتصفح. لتشغيلها، افتح إعدادات الموقع واسمح بالإشعارات.
              </p>
            </div>
          )}

          {settings?.push_enabled && (
            <Button
              variant="secondary"
              size="md"
              onClick={sendTestNotification}
              leftIcon={testSent ? <Check size={16} /> : <Send size={16} />}
              className="w-full"
            >
              {testSent ? 'تم إرسال إشعار تجريبي' : 'إرسال إشعار تجريبي'}
            </Button>
          )}
        </div>
      </Card>

      {/* Daily tip toggle */}
      <Card className="mb-6">
        <CardHeader
          title="النصيحة اليومية"
          subtitle="استلم نصيحة أو اقتباس ملهم كل يوم"
        />
        <div className="flex items-center justify-between p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-100 dark:bg-accent-900/30 text-accent-600 flex items-center justify-center">
              <Lightbulb size={20} />
            </div>
            <div>
              <p className="font-semibold text-neutral-900 dark:text-white">النصيحة اليومية</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                تظهر في الصفحة الرئيسية وترسل كإشعار
              </p>
            </div>
          </div>
          <button
            onClick={() => updateSetting('daily_tip_enabled', !settings?.daily_tip_enabled)}
            className={`relative w-12 h-7 rounded-full transition-all ${
              settings?.daily_tip_enabled ? 'bg-success-500' : 'bg-neutral-300 dark:bg-neutral-600'
            }`}
          >
            <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${
              settings?.daily_tip_enabled ? 'left-1' : 'right-1'
            }`} />
          </button>
        </div>
      </Card>

      {/* Reminder settings */}
      <Card className="mb-6">
        <CardHeader
          title="تذكير المهام"
          subtitle="تذكير يومي بمهامك غير المكتملة"
        />
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 text-primary-600 flex items-center justify-center">
                <Target size={20} />
              </div>
              <div>
                <p className="font-semibold text-neutral-900 dark:text-white">تذكير المهام</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  تذكير بمهام اليوم غير المكتملة
                </p>
              </div>
            </div>
            <button
              onClick={() => updateSetting('reminder_enabled', !settings?.reminder_enabled)}
              className={`relative w-12 h-7 rounded-full transition-all ${
                settings?.reminder_enabled ? 'bg-success-500' : 'bg-neutral-300 dark:bg-neutral-600'
              }`}
            >
              <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${
                settings?.reminder_enabled ? 'left-1' : 'right-1'
              }`} />
            </button>
          </div>

          {settings?.reminder_enabled && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50">
              <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 text-primary-600 flex items-center justify-center">
                <Clock size={20} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-neutral-900 dark:text-white">وقت التذكير</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  اختر الوقت المفضّل للتذكير اليومي
                </p>
              </div>
              <input
                type="time"
                value={settings?.reminder_time || '08:00'}
                onChange={(e) => updateSetting('reminder_time', e.target.value)}
                className="px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white text-sm font-bold"
                dir="ltr"
              />
            </div>
          )}
        </div>
      </Card>

      {/* Tip categories */}
      <Card className="mb-6">
        <CardHeader
          title="مجالات النصائح"
          subtitle="اختر المجالات التي تهمك لتظهر نصائحها"
        />
        <div className="flex flex-wrap gap-2">
          {allInterests.map((key) => {
            const selected = (settings?.categories || []).includes(key);
            return (
              <button
                key={key}
                onClick={() => toggleCategory(key)}
                className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                  selected
                    ? 'bg-primary-600 text-white'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                }`}
              >
                {interestLabels[key]}
              </button>
            );
          })}
        </div>
        {(settings?.categories || []).length === 0 && (
          <p className="text-xs text-neutral-400 mt-3">
            لم تختر مجالات محددة — ستظهر نصائح من كل المجالات
          </p>
        )}
      </Card>

      {/* Per-type preferences */}
      <Card className="mb-6">
        <CardHeader
          title="أنواع الإشعارات"
          subtitle="اختر بالظبط اللي يهمّك — الباقي مش هيوصلك"
        />
        <div className="grid gap-2 sm:grid-cols-2">
          {NOTIFICATION_TYPE_OPTIONS.map((option) => {
            const enabled = isTypeEnabled(option.key);
            return (
              <button
                key={option.key}
                onClick={() => toggleType(option.key)}
                className="flex items-center justify-between gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all"
              >
                <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">{option.label}</span>
                <span className={`relative w-10 h-6 rounded-full transition-all flex-shrink-0 ${
                  enabled ? 'bg-success-500' : 'bg-neutral-300 dark:bg-neutral-600'
                }`}>
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                    enabled ? 'left-1' : 'right-1'
                  }`} />
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Streak reminder info */}
      <Card className="mb-6">
        <CardHeader title="تذكير السلسلة" />
        <div className="flex items-start gap-3 p-4 rounded-xl bg-orange-50 dark:bg-orange-900/20">
          <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 text-orange-600 flex items-center justify-center flex-shrink-0">
            <Zap size={20} />
          </div>
          <div>
            <p className="font-semibold text-neutral-900 dark:text-white text-sm">
              رسائل تشجيعية تلقائية
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              إذا انقطعت سلسلتك اليومية، ستصلك رسالة تشجيعية تحفزك للعودة. تقدر توقفها من «أنواع الإشعارات».
            </p>
          </div>
        </div>
      </Card>

      {/* Back button */}
      <Link to="/profile" className="inline-block">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary-600 dark:text-primary-400 hover:underline">
          <ChevronLeft size={16} className="rotate-180" />
          العودة للملف الشخصي
        </span>
      </Link>
    </Layout>
  );
}
