import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Award, Camera, Check, Pencil, Trash2, Zap } from 'lucide-react';
import { Badge, Button, ProgressBar } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { levelFromXp, xpProgressInLevel } from '@/lib/gamification';

function compressAvatar(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('اختار ملف صورة صحيح'));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      reject(new Error('حجم الصورة لازم يكون أقل من 10 ميجا'));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const size = 320;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('تعذر تجهيز الصورة');
        const side = Math.min(img.width, img.height);
        ctx.drawImage(
          img,
          (img.width - side) / 2, (img.height - side) / 2, side, side,
          0, 0, size, size,
        );
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      } catch (err) {
        reject(err);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('تعذر قراءة الصورة'));
    };
    img.src = url;
  });
}

export function ProfileIdentityCard({ compact = false }: { compact?: boolean }) {
  const { user, profile, updateProfile, refreshProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile?.name || '');
  const [avatar, setAvatar] = useState<string | null>(profile?.avatar || null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) {
      setName(profile?.name || '');
      setAvatar(profile?.avatar || null);
    }
  }, [profile, editing]);

  const displayName = profile?.name?.trim() || user?.email?.split('@')[0] || 'مستخدم نمّي';
  const initials = displayName.charAt(0);
  const xp = profile?.xp || 0;
  const level = levelFromXp(xp);
  const xpProgress = xpProgressInLevel(xp);
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long' })
    : '';

  const onPickAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setMessage(null);
    try {
      setAvatar(await compressAvatar(file));
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : 'تعذر قراءة الصورة', ok: false });
    }
  };

  const save = async () => {
    setBusy(true);
    setMessage(null);
    const { error } = await updateProfile({
      name: name.trim(),
      avatar,
    });
    setBusy(false);
    if (error) {
      setMessage({ text: error, ok: false });
      return;
    }
    setMessage({ text: 'تم حفظ بياناتك بنجاح', ok: true });
    setEditing(false);
    await refreshProfile();
  };

  return (
    <div className="card-base overflow-hidden mb-6">
      <div className="relative bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 px-5 py-7 text-white">
        <button
          type="button"
          onClick={() => { setEditing((v) => !v); setMessage(null); }}
          className="absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-white/15 hover:bg-white/25 px-3 py-1.5 text-xs font-bold transition-colors"
        >
          {editing ? <Check size={14} /> : <Pencil size={14} />}
          {editing ? 'إلغاء' : 'تعديل'}
        </button>

        <div className="flex flex-col items-center text-center gap-3">
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-white/30 bg-white/20 flex items-center justify-center text-3xl font-extrabold shadow-lg">
              {avatar ? (
                <img src={avatar} alt="صورتك الشخصية" className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </div>
            {!compact && (
              <span className="absolute bottom-0 left-0 w-7 h-7 rounded-full bg-success-400 border-4 border-primary-800" />
            )}
          </div>

          <div>
            <h2 className="text-xl font-extrabold">{displayName}</h2>
            <p className="text-sm text-primary-100 mt-0.5" dir="ltr">{user?.email}</p>
            {memberSince && (
              <p className="text-xs text-primary-200/80 mt-1">عضو منذ {memberSince}</p>
            )}
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            <Badge variant="neutral" className="!bg-white/15 !text-white">
              <Zap size={14} className="ml-1" />
              المستوى {level}
            </Badge>
            <Badge variant="neutral" className="!bg-white/15 !text-white">
              <Award size={14} className="ml-1" />
              {xp.toLocaleString('ar-EG')} نقطة
            </Badge>
          </div>

          {!compact && (
            <div className="w-full max-w-sm mt-1">
              <ProgressBar value={xpProgress.percent} size="sm" variant="accent" />
              <p className="text-[11px] text-primary-100 mt-1.5">
                {Math.max(0, xpProgress.needed - xpProgress.current)} نقطة للمستوى التالي
              </p>
            </div>
          )}
        </div>
      </div>

      {editing && (
        <div className="p-5 border-t border-neutral-100 dark:border-neutral-800">
          <div className="flex items-end gap-4">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-16 h-16 rounded-2xl bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 flex flex-col items-center justify-center gap-1 hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors"
            >
              <Camera size={20} />
              <span className="text-[10px] font-bold">صورة</span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onPickAvatar}
              aria-label="اختيار صورة شخصية"
            />
            <div className="flex-1">
              <label htmlFor="profile-name" className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-1.5">
                الاسم المعروض
              </label>
              <input
                id="profile-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                placeholder="اكتب اسمك"
                className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3.5 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
          </div>

          {avatar && (
            <button
              type="button"
              onClick={() => setAvatar(null)}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-error-600 hover:text-error-700"
            >
              <Trash2 size={14} />
              إزالة الصورة الحالية
            </button>
          )}

          {message && (
            <p className={`mt-3 text-xs font-semibold ${message.ok ? 'text-success-600' : 'text-error-600'}`}>
              {message.text}
            </p>
          )}

          <Button size="sm" className="mt-4" onClick={save} disabled={busy}>
            {busy ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}
          </Button>
        </div>
      )}

      {!editing && message && (
        <p className={`px-5 pb-4 text-xs font-semibold ${message.ok ? 'text-success-600' : 'text-error-600'}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
