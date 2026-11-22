import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Heart,
  FlaskConical,
  BookOpen,
  Dumbbell,
  Briefcase,
  Coins,
  Users,
  Brain,
  Crown,
  Cpu,
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui';
import type { LucideIcon } from 'lucide-react';

interface InterestOption {
  id: string;
  label: string;
  icon: LucideIcon;
}

const interestOptions: InterestOption[] = [
  { id: 'spiritual', label: 'روحاني / ديني', icon: Heart },
  { id: 'science', label: 'العلوم', icon: FlaskConical },
  { id: 'culture', label: 'ثقافة وأدب', icon: BookOpen },
  { id: 'health', label: 'الصحة واللياقة', icon: Dumbbell },
  { id: 'career', label: 'المسيرة المهنية', icon: Briefcase },
  { id: 'finance', label: 'المال والاستثمار', icon: Coins },
  { id: 'relationships', label: 'العلاقات والأسرة', icon: Users },
  { id: 'mental', label: 'الصحة النفسية', icon: Brain },
  { id: 'leadership', label: 'القيادة', icon: Crown },
  { id: 'technology', label: 'التقنية', icon: Cpu },
];

const goalOptions = [
  { minutes: 5, label: '5 دقائق', subtitle: 'بداية خفيفة ولطيفة' },
  { minutes: 15, label: '15 دقيقة', subtitle: 'التزام متوازن' },
  { minutes: 30, label: '30 دقيقة', subtitle: 'جدّي وطموح' },
];

const timeSlots = [
  { value: '06:00', label: 'الصباح الباكر', subtitle: '6:00 صباحاً' },
  { value: '08:00', label: 'بعد الاستيقاظ', subtitle: '8:00 صباحاً' },
  { value: '12:00', label: 'منتصف اليوم', subtitle: '12:00 ظهراً' },
  { value: '17:00', label: 'العصر', subtitle: '5:00 مساءً' },
  { value: '20:00', label: 'المساء', subtitle: '8:00 مساءً' },
  { value: '22:00', label: 'قبل النوم', subtitle: '10:00 مساءً' },
];

export default function OnboardingPage() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [dailyGoal, setDailyGoal] = useState<number>(15);
  const [reminderTime, setReminderTime] = useState<string>('08:00');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayName = profile?.name || user?.email?.split('@')[0] || '';

  const toggleInterest = (id: string) => {
    setSelectedInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const canProceed = () => {
    if (step === 2) return selectedInterests.length > 0;
    return true;
  };

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleFinish = async () => {
    setSubmitting(true);
    setError(null);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        interests: selectedInterests,
        daily_goal_minutes: dailyGoal,
        reminder_time: reminderTime,
        onboarded: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user!.id);

    if (updateError) {
      setError(updateError.message);
      setSubmitting(false);
      return;
    }

    await refreshProfile();
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-primary-50 dark:from-neutral-950 dark:to-neutral-900 flex flex-col">
      {/* Progress bar */}
      <div className="px-4 pt-6 pb-2">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary-600 text-white">
                <Sparkles size={16} />
              </div>
              <span className="font-extrabold text-neutral-900 dark:text-white">Sada</span>
            </div>
            <span className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">
              الخطوة {step} من 4
            </span>
          </div>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
                  s <= step ? 'bg-primary-600' : 'bg-neutral-200 dark:bg-neutral-700'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-6">
        <div className="w-full max-w-2xl animate-fade-in">
          {/* Step 1: Welcome */}
          {step === 1 && (
            <div className="text-center animate-scale-in">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white mx-auto mb-6 shadow-glow">
                <Sparkles size={44} />
              </div>
              <h1 className="text-2xl lg:text-3xl font-extrabold text-neutral-900 dark:text-white mb-3">
                أهلاً بك في Sada، {displayName}
              </h1>
              <p className="text-neutral-600 dark:text-neutral-400 text-lg leading-relaxed max-w-lg mx-auto mb-8">
                Sada منصّة عربية لتطوير الذات، تجمع بين البودكاست الملهم، المهام العملية،
                وتتبّع تقدّمك الشخصي — كل ما تحتاجه في رحلة نموّك على طريق واحد.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
                {[
                  { icon: Sparkles, title: 'بودكاست ملهم', desc: 'حلقات في تطوير الذات' },
                  { icon: Check, title: 'مهام يومية', desc: 'خطوات صغيرة، أثر كبير' },
                  { icon: Brain, title: 'تتبّع التقدّم', desc: 'شاهد نموّك يوماً بيوم' },
                ].map((card, i) => (
                  <div
                    key={i}
                    className="card-base p-5 text-center animate-fade-in-up"
                    style={{ animationDelay: `${i * 100}ms` }}
                  >
                    <div className="w-11 h-11 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 mx-auto mb-3">
                      <card.icon size={22} />
                    </div>
                    <h3 className="font-bold text-neutral-900 dark:text-white text-sm">{card.title}</h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{card.desc}</p>
                  </div>
                ))}
              </div>

              <p className="text-sm text-neutral-400 mb-6">
                لنبدأ بتخصيص تجربتك في خطوات سريعة
              </p>
            </div>
          )}

          {/* Step 2: Interests */}
          {step === 2 && (
            <div className="animate-fade-in">
              <div className="text-center mb-6">
                <h2 className="text-xl lg:text-2xl font-extrabold text-neutral-900 dark:text-white mb-2">
                  ما مجالات اهتمامك؟
                </h2>
                <p className="text-neutral-500 dark:text-neutral-400">
                  اختر ما يناسبك — يمكنك تعديله لاحقاً
                </p>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {interestOptions.map((opt) => {
                  const selected = selectedInterests.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      onClick={() => toggleInterest(opt.id)}
                      className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-200 ${
                        selected
                          ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20 shadow-sm'
                          : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:border-primary-300'
                      }`}
                    >
                      {selected && (
                        <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-primary-600 flex items-center justify-center text-white animate-scale-in">
                          <Check size={12} strokeWidth={3} />
                        </div>
                      )}
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                          selected
                            ? 'bg-primary-600 text-white'
                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400'
                        }`}
                      >
                        <opt.icon size={24} />
                      </div>
                      <span className="text-sm font-bold text-neutral-900 dark:text-white text-center">
                        {opt.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {selectedInterests.length > 0 && (
                <p className="text-center text-sm text-primary-600 dark:text-primary-400 font-semibold mt-4 animate-fade-in">
                  تم اختيار {selectedInterests.length} {selectedInterests.length === 1 ? 'مجال' : 'مجالات'}
                </p>
              )}
            </div>
          )}

          {/* Step 3: Daily Goal */}
          {step === 3 && (
            <div className="animate-fade-in">
              <div className="text-center mb-6">
                <h2 className="text-xl lg:text-2xl font-extrabold text-neutral-900 dark:text-white mb-2">
                  ما هدفك اليومي؟
                </h2>
                <p className="text-neutral-500 dark:text-neutral-400">
                  كم دقيقة تريد تخصيصها يومياً لتطوير ذاتك؟
                </p>
              </div>

              <div className="space-y-3">
                {goalOptions.map((goal) => {
                  const selected = dailyGoal === goal.minutes;
                  return (
                    <button
                      key={goal.minutes}
                      onClick={() => setDailyGoal(goal.minutes)}
                      className={`w-full flex items-center gap-4 p-5 rounded-2xl border-2 transition-all duration-200 ${
                        selected
                          ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20 shadow-sm'
                          : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:border-primary-300'
                      }`}
                    >
                      <div
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
                          selected
                            ? 'bg-primary-600 text-white'
                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400'
                        }`}
                      >
                        <Clock size={26} />
                      </div>
                      <div className="text-right flex-1">
                        <h3 className="text-lg font-extrabold text-neutral-900 dark:text-white">
                          {goal.label}
                        </h3>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">{goal.subtitle}</p>
                      </div>
                      {selected && (
                        <div className="w-6 h-6 rounded-full bg-primary-600 flex items-center justify-center text-white animate-scale-in">
                          <Check size={14} strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 4: Reminder Time */}
          {step === 4 && (
            <div className="animate-fade-in">
              <div className="text-center mb-6">
                <h2 className="text-xl lg:text-2xl font-extrabold text-neutral-900 dark:text-white mb-2">
                  متى تذكيرك اليومي؟
                </h2>
                <p className="text-neutral-500 dark:text-neutral-400">
                  اختر الوقت المفضّل لتذكيرك بمهامك اليومية
                </p>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {timeSlots.map((slot) => {
                  const selected = reminderTime === slot.value;
                  return (
                    <button
                      key={slot.value}
                      onClick={() => setReminderTime(slot.value)}
                      className={`flex flex-col items-center gap-1 p-5 rounded-2xl border-2 transition-all duration-200 ${
                        selected
                          ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20 shadow-sm'
                          : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:border-primary-300'
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center mb-1 transition-colors ${
                          selected
                            ? 'bg-primary-600 text-white'
                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400'
                        }`}
                      >
                        <Clock size={20} />
                      </div>
                      <span className="font-bold text-neutral-900 dark:text-white text-sm">
                        {slot.label}
                      </span>
                      <span className="text-xs text-neutral-400">{slot.subtitle}</span>
                    </button>
                  );
                })}
              </div>

              {error && (
                <div className="mt-4 px-4 py-3 rounded-xl bg-error-50 dark:bg-error-900/20 text-error-600 dark:text-error-400 text-sm font-medium text-center">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Navigation buttons */}
      <div className="px-4 pb-8 pt-2">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          {step > 1 && (
            <Button variant="secondary" size="md" onClick={handleBack} disabled={submitting}>
              <ArrowRight size={18} />
              السابق
            </Button>
          )}

          <div className="flex-1" />

          {step < 4 ? (
            <Button
              variant="primary"
              size="md"
              onClick={handleNext}
              disabled={!canProceed()}
              rightIcon={<ArrowLeft size={18} />}
            >
              التالي
            </Button>
          ) : (
            <Button
              variant="primary"
              size="md"
              onClick={handleFinish}
              disabled={submitting}
              rightIcon={submitting ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
            >
              {submitting ? 'جارٍ الحفظ...' : 'ابدأ الآن'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
