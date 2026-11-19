import { FormEvent, useEffect, useState } from 'react';
import { Eye, EyeOff, KeyRound, Save, ShieldCheck } from 'lucide-react';
import { SiteSettings } from '../../types/catalog';
import { ownerFetch } from '../../utils/ownerApi';

interface SettingsTabProps {
  settings: SiteSettings;
  ownerUsername: string;
  onRefreshWorkspace: () => Promise<void>;
  onNotify: (msg: string, isError?: boolean) => void;
}

export function SettingsTab({
  settings,
  ownerUsername,
  onRefreshWorkspace,
  onNotify,
}: SettingsTabProps) {
  const [form, setForm] = useState<SiteSettings>(settings);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  const handleSaveSettings = async (e: FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      const res = await ownerFetch('/api/owner/settings', {
        method: 'PUT',
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        onNotify(data?.error || 'تعذر حفظ الإعدادات.', true);
        return;
      }
      await onRefreshWorkspace();
      onNotify('تم حفظ إعدادات الموقع بنجاح.');
    } catch {
      onNotify('حدث خطأ أثناء حفظ الإعدادات.', true);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      onNotify('يرجى إدخال كلمة المرور الحالية والجديدة.', true);
      return;
    }
    if (newPassword.length < 8) {
      onNotify('يجب أن تتكون كلمة المرور الجديدة من 8 أحرف على الأقل.', true);
      return;
    }
    if (newPassword.trim() === ownerUsername) {
      onNotify('لا يمكن استخدام اسم المستخدم ككلمة مرور.', true);
      return;
    }
    if (newPassword !== confirmPassword) {
      onNotify('كلمتا المرور الجديدتان غير متطابقتين.', true);
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await ownerFetch('/api/owner/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        onNotify(data?.error || 'تعذر تغيير كلمة المرور.', true);
        return;
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onNotify('تم تغيير كلمة مرور المالك بنجاح.');
    } catch {
      onNotify('حدث خطأ أثناء تحديث كلمة المرور.', true);
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-8 text-right">
      {/* General Brand & Affiliate Disclosure Settings */}
      <form
        onSubmit={handleSaveSettings}
        className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="font-display text-xl font-bold text-slate-950">
              إعدادات الموقع والربط مع أمازون مصر
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              بيانات الهوية الرسمية ومعرف الشريك (Amazon Associate Tag) وإفصاح العمولة.
            </p>
          </div>
          <button
            type="submit"
            disabled={isSavingSettings}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-sm font-bold disabled:opacity-60"
          >
            <Save className="w-4 h-4" aria-hidden="true" />
            <span>{isSavingSettings ? 'جاري الحفظ...' : 'حفظ الإعدادات'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-slate-800">اسم العلامة (بالعربية)</span>
            <input
              type="text"
              value={form.brandArabic}
              onChange={(e) => setForm({ ...form, brandArabic: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-slate-800">اسم العلامة (بالإنجليزية)</span>
            <input
              type="text"
              dir="ltr"
              value={form.brandEnglish}
              onChange={(e) => setForm({ ...form, brandEnglish: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-latin text-slate-900"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-slate-800">معرف شريك أمازون (Tag)</span>
            <input
              type="text"
              dir="ltr"
              value={form.amazonTag}
              onChange={(e) => setForm({ ...form, amazonTag: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-latin text-slate-900"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-slate-800">نبذة التذييل (Footer)</span>
            <textarea
              rows={3}
              value={form.footerAbout}
              onChange={(e) => setForm({ ...form, footerAbout: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-slate-800">نص إفصاح روابط أمازون</span>
            <textarea
              rows={3}
              value={form.affiliateDisclosure}
              onChange={(e) => setForm({ ...form, affiliateDisclosure: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900"
            />
          </label>
        </div>
      </form>

      {/* Owner Account Security & Password Change */}
      <form
        onSubmit={handleChangePassword}
        className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
              <KeyRound className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-slate-950">
                أمان حساب المالك وتغيير كلمة المرور
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                اسم المستخدم المعتمد:{' '}
                <span dir="ltr" className="font-latin font-bold text-slate-800">
                  {ownerUsername}
                </span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowPasswords((prev) => !prev)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            {showPasswords ? (
              <>
                <EyeOff className="w-4 h-4" aria-hidden="true" />
                <span>إخفاء كلمات المرور</span>
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" aria-hidden="true" />
                <span>إظهار كلمات المرور</span>
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-slate-800">كلمة المرور الحالية</span>
            <input
              type={showPasswords ? 'text' : 'password'}
              dir="ltr"
              required
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-latin text-slate-900"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-slate-800">كلمة المرور الجديدة</span>
            <input
              type={showPasswords ? 'text' : 'password'}
              dir="ltr"
              required
              minLength={8}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="8 أحرف على الأقل"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-latin text-slate-900"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-slate-800">تأكيد كلمة المرور الجديدة</span>
            <input
              type={showPasswords ? 'text' : 'password'}
              dir="ltr"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-latin text-slate-900"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-700" aria-hidden="true" />
            <span>يتم تشفير كلمة المرور بالخادم باستخدام Scrypt ولا تُخزن كنص صريح أبداً.</span>
          </span>

          <button
            type="submit"
            disabled={isChangingPassword}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold disabled:opacity-60"
          >
            {isChangingPassword ? 'جاري التحديث...' : 'تحديث كلمة المرور'}
          </button>
        </div>
      </form>
    </div>
  );
}
