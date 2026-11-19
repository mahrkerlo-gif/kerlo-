import { FormEvent, useState } from 'react';
import { ArrowRight, Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react';
import { setStoredOwnerToken } from '../utils/ownerApi';

interface OwnerLoginPageProps {
  onLoginSuccess: (username: string) => void;
  onNavigateHome: () => void;
}

export function OwnerLoginPage({
  onLoginSuccess,
  onNavigateHome,
}: OwnerLoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!username.trim() || !password) {
      setErrorMessage('يرجى إدخال اسم المستخدم وكلمة المرور.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/owner/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok) {
        setErrorMessage(data?.error || 'بيانات الدخول غير صحيحة.');
        return;
      }

      if (data.token) {
        setStoredOwnerToken(data.token);
      }
      onLoginSuccess(data.username);
    } catch {
      setErrorMessage('تعذر الاتصال بالخادم. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12 sm:py-20 text-right">
      <div className="mb-6">
        <button
          type="button"
          onClick={onNavigateHome}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-950 transition-colors"
        >
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
          <span>العودة للموقع</span>
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="space-y-2">
          <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-800">
            <Lock className="w-5 h-5" aria-hidden="true" />
          </div>
          <h1 className="font-display text-2xl font-bold text-slate-950">
            دخول المالك
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            سجل دخولك لإدارة أقسام ومنتجات ومقالات موقع{' '}
            <span className="font-semibold text-slate-900">اختيارك | EKHTYARAK</span>{' '}
            ومتابعة إحصائيات الزيارات ونقرات أمازون مصر.
          </p>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-900"
          >
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-slate-800">اسم المستخدم</span>
            <input
              type="text"
              dir="ltr"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="أدخل معرف المالك"
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-base font-latin text-slate-900 focus:outline-2 focus:outline-amber-700"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-slate-800">كلمة المرور</span>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                dir="ltr"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 pl-11 text-base font-latin text-slate-900 focus:outline-2 focus:outline-amber-700"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 p-1"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <Eye className="w-4 h-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold text-base transition-colors disabled:opacity-60"
          >
            {isSubmitting ? 'جاري التحقق...' : 'تسجيل الدخول'}
          </button>
        </form>

        <div className="pt-4 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
          <span>جلسة محمية بالخادم — يتم التحقق من الصلاحيات قبل أي عملية إدارة.</span>
        </div>
      </div>
    </div>
  );
}
