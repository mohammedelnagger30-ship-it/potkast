import { useEffect, useState, useCallback, useRef } from 'react';
import { Layout } from '@/components/layout';
import { Card, CardHeader, Badge, Button } from '@/components/ui';
import {
  Award, Footprints, Flame, BookOpen, CheckCircle, Sparkles, Trophy, Mic,
  Target, Medal, Zap, Crown, Headphones, Star, Rocket, Leaf, Lock, Share2, Download, X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { achievementDefs, achievementColors, getLevelInfo, type Achievement } from '@/lib/gamification';

const iconMap: Record<string, typeof Award> = {
  footprints: Footprints,
  flame: Flame,
  'book-open': BookOpen,
  'check-circle': CheckCircle,
  sparkles: Sparkles,
  award: Award,
  trophy: Trophy,
  mic: Mic,
  target: Target,
  medal: Medal,
  zap: Zap,
  crown: Crown,
  headphones: Headphones,
  star: Star,
  rocket: Rocket,
  leaf: Leaf,
};

const metricLabels: Record<string, string> = {
  missions: 'مهام مكتملة',
  streak: 'أيام متتالية',
  xp: 'نقاط خبرة',
  podcasts: 'حلقات مستمعة',
};

export default function AchievementsPage() {
  const { user, profile } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [sharingAch, setSharingAch] = useState<Achievement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const loadAchievements = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: completed } = await supabase
      .from('user_missions')
      .select('completed_at')
      .eq('user_id', user.id)
      .eq('status', 'completed');

    const { data: listened } = await supabase
      .from('listening_history')
      .select('episode_id')
      .eq('user_id', user.id);

    const allDates = (completed || [])
      .filter((c) => c.completed_at)
      .map((c) => new Date(c.completed_at!).toISOString().split('T')[0]);
    const uniqueDates = [...new Set(allDates)].sort();

    let maxStreak = 0;
    let temp = 0;
    for (let i = 0; i < uniqueDates.length; i++) {
      if (i === 0) temp = 1;
      else {
        const prev = new Date(uniqueDates[i - 1]);
        const curr = new Date(uniqueDates[i]);
        if (Math.round((curr.getTime() - prev.getTime()) / 86400000) === 1) temp++;
        else temp = 1;
      }
      maxStreak = Math.max(maxStreak, temp);
    }

    const xp = profile?.xp || 0;
    const missionCount = completed?.length || 0;
    const podcastCount = listened?.length || 0;

    const unlocked: Achievement[] = achievementDefs.map((def) => {
      let isUnlocked = false;
      switch (def.metric) {
        case 'missions': isUnlocked = missionCount >= def.threshold; break;
        case 'streak': isUnlocked = maxStreak >= def.threshold; break;
        case 'xp': isUnlocked = xp >= def.threshold; break;
        case 'podcasts': isUnlocked = podcastCount >= def.threshold; break;
      }
      return { ...def, unlocked: isUnlocked };
    });

    setAchievements(unlocked);
    setLoading(false);
  }, [user, profile]);

  useEffect(() => {
    loadAchievements();
  }, [loadAchievements]);

  const generateShareCard = (ach: Achievement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = 600;
    const h = 400;
    canvas.width = w;
    canvas.height = h;

    const colors = achievementColors[ach.id] || achievementColors.first_step;
    const gradient = ctx.createLinearGradient(0, 0, w, h);
    gradient.addColorStop(0, '#0F766E');
    gradient.addColorStop(1, '#0E5A52');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath();
    ctx.arc(w - 60, 60, 100, 0, Math.PI * 2);
    ctx.fill();

    const levelInfo = getLevelInfo(profile?.xp || 0);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('نمّي — رحلة تطوير الذات', w - 30, 35);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🏆 وسام جديد مفتوح!', w / 2, 100);

    const badgeGrad = ctx.createLinearGradient(w / 2 - 50, 150, w / 2 + 50, 250);
    badgeGrad.addColorStop(0, '#D4A017');
    badgeGrad.addColorStop(1, '#B8860B');
    ctx.fillStyle = badgeGrad;
    ctx.beginPath();
    ctx.arc(w / 2, 200, 55, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText('★', w / 2, 213);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(ach.label, w / 2, 300);

    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '14px sans-serif';
    ctx.fillText(`${metricLabels[ach.metric]}: ${ach.threshold}`, w / 2, 325);

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '12px sans-serif';
    ctx.fillText(profile?.name || 'مستخدم نمّي', w / 2, 370);
  };

  const shareAchievement = (ach: Achievement) => {
    setSharingAch(ach);
    setTimeout(() => generateShareCard(ach), 100);
  };

  const downloadCard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `achievement-${sharingAch?.id || 'card'}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const shareCard = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/png')
      );
      if (!blob) return;
      const file = new File([blob], 'achievement.png', { type: 'image/png' });
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'وسامي في نمّي',
          text: `فازحت بوسام: ${sharingAch?.label}`,
          files: [file],
        });
      } else {
        downloadCard();
      }
    } catch {
      downloadCard();
    }
  };

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  if (loading) {
    return (
      <Layout title="الإنجازات">
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 rounded-full border-4 border-primary-600 border-t-transparent animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="الإنجازات">
      <div className="mb-6">
        <Card className="bg-gradient-to-br from-accent-500 to-accent-700 text-white">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <Trophy size={28} />
            </div>
            <div>
              <h2 className="text-xl font-extrabold">إنجازاتك وأوسمتك</h2>
              <p className="text-accent-100 text-sm mt-0.5">
                فتحت {unlockedCount} من {achievements.length} وسام
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {achievements.map((ach) => {
          const Icon = iconMap[ach.icon] || Award;
          const colors = achievementColors[ach.id] || achievementColors.first_step;
          return (
            <Card key={ach.id} className={`flex flex-col items-center text-center ${ach.unlocked ? '' : 'opacity-60'}`}>
              <div className={`relative w-20 h-20 rounded-full flex items-center justify-center mb-3 ${
                ach.unlocked
                  ? `bg-gradient-to-br ${colors.bg} text-white shadow-lg`
                  : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-400'
              }`}>
                {ach.unlocked ? <Icon size={32} /> : <Lock size={24} />}
                {ach.unlocked && (
                  <div className={`absolute -inset-1 rounded-full ring-2 ${colors.ring} opacity-50`} />
                )}
              </div>
              <p className={`font-bold text-sm mb-1 ${ach.unlocked ? 'text-neutral-900 dark:text-white' : 'text-neutral-400'}`}>
                {ach.label}
              </p>
              <p className="text-xs text-neutral-400 mb-2">
                {metricLabels[ach.metric]}: {ach.threshold}
              </p>
              {ach.unlocked ? (
                <button
                  onClick={() => shareAchievement(ach)}
                  className="flex items-center gap-1 text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline"
                >
                  <Share2 size={12} />
                  مشاركة
                </button>
              ) : (
                <Badge variant="neutral" size="sm">مقفل</Badge>
              )}
            </Card>
          );
        })}
      </div>

      {sharingAch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in" onClick={() => setSharingAch(null)}>
          <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-neutral-900 dark:text-white">بطاقة الإنجاز</h3>
              <button onClick={() => setSharingAch(null)} className="text-neutral-400 hover:text-neutral-600">
                <X size={20} />
              </button>
            </div>
            <canvas ref={canvasRef} className="w-full rounded-xl mb-4" />
            <div className="flex gap-3">
              <Button onClick={shareCard} leftIcon={<Share2 size={16} />} className="flex-1">
                مشاركة
              </Button>
              <Button variant="secondary" onClick={downloadCard} leftIcon={<Download size={16} />}>
                تحميل
              </Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
