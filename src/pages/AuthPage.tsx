import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Mail, Lock, User as UserIcon, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Button } from '@/components/ui';

function isAlreadyRegistered(message: string) {
  const text = message.toLowerCase();
  return text.includes('already registered')
    || text.includes('already exists')
    || text.includes('already been registered')
    || text.includes('موجود');
}

function friendlyError(message: string) {
  if (isAlreadyRegistered(message)) {
    return 'الحساب ده موجود بالفعل. سجّل الدخول بدل ما تعمل حساب جديد.';
  }
  if (message.toLowerCase().includes('invalid login credentials')) {
    return 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
  }
  return message;
}

export default function AuthPage() {
  const { signIn, signUp } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setSubmitting(true);

    if (mode === 'signup') {
      if (!name.trim()) {
        setError('الرجاء إدخال الاسم');
        setSubmitting(false);
        return;
      }
      const { error: signUpError, needsConfirmation } = await signUp(email, password, name.trim());
      if (signUpError) {
        setError(friendlyError(signUpError));
        if (isAlreadyRegistered(signUpError)) setMode('login');
      } else if (needsConfirmation) {
        setNotice(`تم إنشاء حسابك (${email}) بنجاح. افتح بريدك الإلكتروني واضغط رابط التأكيد، ثم سجّل الدخول.`);
        setMode('login');
      } else {
        // Email confirmation is off: Supabase already signed the user in.
        // Go straight into the app (OnboardingGuard handles first-time setup).
        navigate('/', { replace: true });
        return;
      }
      setSubmitting(false);
    } else {
      const { error: signInError } = await signIn(email, password);
      if (signInError) {
        setError(friendlyError(signInError));
      } else {
        navigate('/', { replace: true });
        return;
      }
      setSubmitting(false);
    }
  };


  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-neutral-50 to-primary-50 dark:from-neutral-950 dark:to-neutral-900">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary-600 text-white">
            <Sparkles size={18} />
          </div>
          <span className="text-lg font-extrabold text-neutral-900 dark:text-white">Sada</span>
        </div>
        <button
          onClick={toggleTheme}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800 transition-all"
          aria-label="تبديل الوضع"
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
      </div>

      {/* Auth card */}
      <div className="flex-1 flex items-center justify-center px-4 pb-12">
        <div className="w-full max-w-md animate-fade-in-up">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-extrabold text-neutral-900 dark:text-white mb-2">
              {mode === 'signup' ? 'ابدأ رحلتك مع Sada' : 'مرحباً بعودتك'}
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400">
              {mode === 'signup'
                ? 'أنشئ حسابك وابدأ في تطوير ذاتك اليوم'
                : 'سجّل الدخول لمتابعة تقدّمك'}
            </p>
          </div>

          <div className="card-base p-6 lg:p-8">
            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                    الاسم
                  </label>
                  <div className="relative">
                    <UserIcon size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="أدخل اسمك"
                      className="w-full pr-11 pl-4 py-3 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                      disabled={submitting}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  البريد الإلكتروني
                </label>
                <div className="relative">
                  <Mail size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@email.com"
                    required
                    className="w-full pr-11 pl-4 py-3 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                    disabled={submitting}
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  كلمة المرور
                </label>
                <div className="relative">
                  <Lock size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="w-full pr-11 pl-11 py-3 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                    disabled={submitting}
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {notice && (
                <div className="px-4 py-3 rounded-xl bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 text-sm font-medium leading-relaxed">
                  {notice}
                </div>
              )}

              {error && (
                <div className="px-4 py-3 rounded-xl bg-error-50 dark:bg-error-900/20 text-error-600 dark:text-error-400 text-sm font-medium">
                  {error}
                </div>
              )}

              <Button type="submit" fullWidth size="lg" disabled={submitting}>
                {submitting ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : mode === 'signup' ? (
                  'إنشاء حساب'
                ) : (
                  'تسجيل الدخول'
                )}
              </Button>
            </form>

            <p className="text-center text-sm text-neutral-500 dark:text-neutral-400 mt-6">
              {mode === 'signup' ? 'لديك حساب بالفعل؟' : 'ليس لديك حساب؟'}{' '}
              <button
                onClick={() => {
                  setMode(mode === 'signup' ? 'login' : 'signup');
                  setError(null);
                  setNotice(null);
                }}
                className="font-bold text-primary-600 dark:text-primary-400 hover:underline"
              >
                {mode === 'signup' ? 'سجّل الدخول' : 'أنشئ حساباً'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
