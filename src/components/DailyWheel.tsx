import { useState, useRef, useEffect } from 'react';
import { Card, CardHeader, Badge } from '@/components/ui';
import { Gift, Sparkles, Zap, Lightbulb, Target, Shield } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { WheelSpin } from '@/types/features';

const segments = [
  { type: 'xp', amount: 50, label: '+50 نقطة', top: '+50', bottom: 'نقطة', color: '#0D9488', light: '#2DD4BF', icon: Zap },
  { type: 'tip', amount: 0, label: 'نصيحة خاصة', top: 'نصيحة', bottom: 'خاصة', color: '#D97706', light: '#FBBF24', icon: Lightbulb },
  { type: 'xp', amount: 100, label: '+100 نقطة', top: '+100', bottom: 'نقطة', color: '#059669', light: '#34D399', icon: Zap },
  { type: 'mission', amount: 0, label: 'مهمة مفاجئة', top: 'مهمة', bottom: 'مفاجئة', color: '#EA580C', light: '#FB923C', icon: Target },
  { type: 'xp', amount: 25, label: '+25 نقطة', top: '+25', bottom: 'نقطة', color: '#0284C7', light: '#38BDF8', icon: Zap },
  { type: 'streak_shield', amount: 1, label: 'درع السلسلة', top: 'درع', bottom: 'السلسلة', color: '#7C3AED', light: '#A78BFA', icon: Shield },
  { type: 'xp', amount: 75, label: '+75 نقطة', top: '+75', bottom: 'نقطة', color: '#E11D48', light: '#FB7185', icon: Zap },
  { type: 'xp', amount: 200, label: '+200 نقطة', top: '+200', bottom: 'نقطة', color: '#B45309', light: '#FCD34D', icon: Sparkles },
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
        <div className="relative w-60 h-60 sm:w-64 sm:h-64 mb-4">
          {/* Pointer */}
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-20 w-0 h-0 border-l-[11px] border-r-[11px] border-t-[18px] border-l-transparent border-r-transparent border-t-primary-600 drop-shadow-md" />

          {/* Wheel */}
          <div
            ref={wheelRef}
            className="w-full h-full rounded-full overflow-hidden border-[6px] border-white dark:border-neutral-800 ring-4 ring-primary-500/10 shadow-xl transition-transform"
            style={{
              transform: `rotate(${rotation}deg)`,
              transitionDuration: spinning ? '4s' : '0s',
              transitionTimingFunction: 'cubic-bezier(0.17, 0.67, 0.12, 0.99)',
            }}
          >
            <svg viewBox="0 0 200 200" className="w-full h-full">
              <defs>
                {segments.map((seg, i) => (
                  <linearGradient key={i} id={`wheel-seg-${i}`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor={seg.light} />
                    <stop offset="100%" stopColor={seg.color} />
                  </linearGradient>
                ))}
                <linearGradient id="wheel-rim" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#CBD5E1" />
                  <stop offset="50%" stopColor="#FFFFFF" />
                  <stop offset="100%" stopColor="#94A3B8" />
                </linearGradient>
                <radialGradient id="wheel-gloss" cx="35%" cy="25%" r="75%">
                  <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.38" />
                  <stop offset="70%" stopColor="#FFFFFF" stopOpacity="0" />
                </radialGradient>
                <linearGradient id="wheel-hub" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#14B8A6" />
                  <stop offset="100%" stopColor="#4F46E5" />
                </linearGradient>
              </defs>

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
                const tx = 100 + 56 * Math.cos(midRad);
                const ty = 100 + 56 * Math.sin(midRad);
                return (
                  <g key={i}>
                    <path
                      d={`M100,100 L${x1},${y1} A90,90 0 0,1 ${x2},${y2} Z`}
                      fill={`url(#wheel-seg-${i})`}
                      stroke="rgba(255,255,255,0.8)"
                      strokeWidth="1.4"
                    />
                    <text
                      x={tx}
                      y={ty}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#FFFFFF"
                      fontWeight="800"
                      paintOrder="stroke"
                      stroke="rgba(15,23,42,0.22)"
                      strokeWidth="0.6"
                    >
                      <tspan x={tx} dy="-4" fontSize="9">{seg.top}</tspan>
                      <tspan x={tx} dy="10" fontSize="7.5">{seg.bottom}</tspan>
                    </text>
                  </g>
                );
              })}

              {/* Gloss + rims */}
              <circle cx="100" cy="100" r="90" fill="url(#wheel-gloss)" pointerEvents="none" />
              <circle cx="100" cy="100" r="78" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="1" />
              <circle cx="100" cy="100" r="94" fill="none" stroke="url(#wheel-rim)" strokeWidth="4" />

              {/* Segment ticks */}
              {segments.map((_, i) => {
                const rad = ((i * segmentAngle - 90) * Math.PI) / 180;
                return (
                  <circle
                    key={i}
                    cx={100 + 98 * Math.cos(rad)}
                    cy={100 + 98 * Math.sin(rad)}
                    r="2"
                    fill="#FFFFFF"
                    opacity="0.9"
                  />
                );
              })}

              {/* Hub */}
              <circle cx="100" cy="100" r="19" fill="#FFFFFF" opacity="0.96" />
              <circle cx="100" cy="100" r="14" fill="url(#wheel-hub)" />
              <text x="100" y="101" textAnchor="middle" dominantBaseline="middle" fill="#FFFFFF" fontSize="13" fontWeight="bold">★</text>
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
