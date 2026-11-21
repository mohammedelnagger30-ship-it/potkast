import { useState, useRef, useEffect } from 'react';
import { Card, CardHeader, Badge } from '@/components/ui';
import { Gift, Sparkles, Zap, Lightbulb, Target, Shield } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { WheelSpin } from '@/types/features';

const segments = [
  { type: 'xp', amount: 50, label: '+50 نقطة', color: '#0F766E', icon: Zap },
  { type: 'tip', amount: 0, label: 'نصيحة خاصة', color: '#D4A017', icon: Lightbulb },
  { type: 'xp', amount: 100, label: '+100 نقطة', color: '#10B981', icon: Zap },
  { type: 'mission', amount: 0, label: 'مهمة مفاجئة', color: '#F97316', icon: Target },
  { type: 'xp', amount: 25, label: '+25 نقطة', color: '#0EA5E9', icon: Zap },
  { type: 'streak_shield', amount: 1, label: 'درع السلسلة', color: '#8B5CF6', icon: Shield },
  { type: 'xp', amount: 75, label: '+75 نقطة', color: '#EF4444', icon: Zap },
  { type: 'xp', amount: 200, label: '+200 نقطة', color: '#F59E0B', icon: Sparkles },
] as const;

export function DailyWheel() {
  const { user } = useAuth();
  const [todaySpin, setTodaySpin] = useState<WheelSpin | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [resultIndex, setResultIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const wheelRef = useRef<HTMLDivElement>(null);

  const loadTodaySpin = async () => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('wheel_spins')
      .select('*')
      .eq('user_id', user.id)
      .eq('spin_date', today)
      .maybeSingle();
    setTodaySpin(data as WheelSpin | null);
    setLoading(false);
  };

  useEffect(() => {
    loadTodaySpin();
  }, []);

  const spin = async () => {
    if (!user || spinning || todaySpin) return;
    setSpinning(true);

    const targetIndex = Math.floor(Math.random() * segments.length);
    const segAngle = 360 / segments.length;
    const targetAngle = 360 * 5 + (360 - targetIndex * segAngle - segAngle / 2);
    setRotation(targetAngle);

    setTimeout(async () => {
      const segment = segments[targetIndex];
      const today = new Date().toISOString().split('T')[0];

      let detail = '';
      if (segment.type === 'tip') {
        const { data: tips } = await supabase.from('tips').select('*').limit(20);
        if (tips && tips.length > 0) {
          const tip = tips[Math.floor(Math.random() * tips.length)];
          detail = `${tip.text_ar}${tip.author_or_source ? ' — ' + tip.author_or_source : ''}`;
        }
      } else if (segment.type === 'mission') {
        const { data: missions } = await supabase.from('missions').select('id, title, xp_reward').limit(20);
        if (missions && missions.length > 0) {
          const mission = missions[Math.floor(Math.random() * missions.length)];
          detail = mission.title;
          await supabase.from('user_missions').insert({
            user_id: user.id,
            mission_id: mission.id,
            status: 'pending',
            assigned_date: today,
          });
        }
      }

      if (segment.type === 'xp' && segment.amount > 0) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('xp')
          .eq('id', user.id)
          .maybeSingle();
        if (profile) {
          await supabase.from('profiles').update({ xp: profile.xp + segment.amount }).eq('id', user.id);
        }
      }

      const { data: spinRecord } = await supabase
        .from('wheel_spins')
        .insert({
          user_id: user.id,
          spin_date: today,
          reward_type: segment.type,
          reward_amount: segment.amount,
          reward_detail: detail,
        })
        .select('*')
        .maybeSingle();

      setTodaySpin(spinRecord as WheelSpin | null);
      setResultIndex(targetIndex);
      setSpinning(false);
    }, 4000);
  };

  const segmentAngle = 360 / segments.length;

  return (
    <Card className="mb-6">
      <CardHeader
        title="عجلة الجوائز اليومية"
        subtitle={todaySpin ? 'لقد أدرت العجلة اليوم — عُد غداً!' : 'أدر العجلة واربح جائزة عشوائية'}
        action={<Badge variant="accent"><Gift size={14} className="ml-1" />يومي</Badge>}
      />

      <div className="flex flex-col items-center">
        <div className="relative w-56 h-56 mb-4">
          {/* Pointer */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-10 w-0 h-0 border-l-[10px] border-r-[10px] border-t-[16px] border-l-transparent border-r-transparent border-t-neutral-900 dark:border-t-white" />

          {/* Wheel */}
          <div
            ref={wheelRef}
            className="w-full h-full rounded-full overflow-hidden border-4 border-neutral-200 dark:border-neutral-700 shadow-lg transition-transform"
            style={{
              transform: `rotate(${rotation}deg)`,
              transitionDuration: spinning ? '4s' : '0s',
              transitionTimingFunction: 'cubic-bezier(0.17, 0.67, 0.12, 0.99)',
            }}
          >
            <svg viewBox="0 0 200 200" className="w-full h-full">
              {segments.map((seg, i) => {
                const startAngle = i * segmentAngle - 90;
                const endAngle = (i + 1) * segmentAngle - 90;
                const startRad = (startAngle * Math.PI) / 180;
                const endRad = (endAngle * Math.PI) / 180;
                const x1 = 100 + 90 * Math.cos(startRad);
                const y1 = 100 + 90 * Math.sin(startRad);
                const x2 = 100 + 90 * Math.cos(endRad);
                const y2 = 100 + 90 * Math.sin(endRad);
                const midAngle = (startAngle + endAngle) / 2;
                const midRad = (midAngle * Math.PI) / 180;
                const tx = 100 + 50 * Math.cos(midRad);
                const ty = 100 + 50 * Math.sin(midRad);
                return (
                  <g key={i}>
                    <path
                      d={`M100,100 L${x1},${y1} A90,90 0 0,1 ${x2},${y2} Z`}
                      fill={seg.color}
                      opacity={0.85}
                    />
                    <text
                      x={tx}
                      y={ty}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="white"
                      fontSize="7"
                      fontWeight="bold"
                      transform={`rotate(${midAngle + 90}, ${tx}, ${ty})`}
                    >
                      {seg.label}
                    </text>
                  </g>
                );
              })}
              <circle cx="100" cy="100" r="12" fill="white" />
            </svg>
          </div>
        </div>

        {todaySpin ? (
          <div className="text-center animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300 font-bold text-sm mb-2">
              <Sparkles size={16} />
              {todaySpin.reward_type === 'xp' && `+${todaySpin.reward_amount} نقطة خبرة!`}
              {todaySpin.reward_type === 'tip' && 'نصيحة خاصة لك'}
              {todaySpin.reward_type === 'mission' && 'مهمة مفاجئة أُضيفت!'}
              {todaySpin.reward_type === 'streak_shield' && 'درع السلسلة — تحمي سلسلتك ليوم!'}
            </div>
            {todaySpin.reward_detail && (
              <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-xs">
                {todaySpin.reward_detail}
              </p>
            )}
          </div>
        ) : (
          <button
            onClick={spin}
            disabled={spinning || loading}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Gift size={18} />
            {spinning ? 'جارية الدوران...' : 'أدر العجلة'}
          </button>
        )}
      </div>
    </Card>
  );
}
