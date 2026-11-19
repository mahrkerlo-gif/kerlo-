import { FormEvent, useEffect, useState } from 'react';
import { Check, Eye, EyeOff, Save } from 'lucide-react';
import { BADGE_LABELS, formatEgpPrice } from '../../data/catalog';
import { Product, ProductBadge, SiteSettings } from '../../types/catalog';
import { ownerFetch } from '../../utils/ownerApi';

interface ContentTabProps {
  settings: SiteSettings;
  products: Product[];
  onRefreshWorkspace: () => Promise<void>;
  onNotify: (msg: string, isError?: boolean) => void;
}

const CURATION_BADGES: ProductBadge[] = ['featured', 'popular', 'best_value', 'discounted', 'new'];

export function ContentTab({
  settings,
  products,
  onRefreshWorkspace,
  onNotify,
}: ContentTabProps) {
  const [form, setForm] = useState<SiteSettings>(settings);
  const [isSaving, setIsSaving] = useState(false);
  const [updatingProdId, setUpdatingProdId] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  const handleSaveContent = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await ownerFetch('/api/owner/settings', {
        method: 'PUT',
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        onNotify(data?.error || 'تعذر حفظ محتوى الصفحة الرئيسية.', true);
        return;
      }
      await onRefreshWorkspace();
      onNotify('تم حفظ نصوص وإعدادات العرض بالصفحة الرئيسية.');
    } catch {
      onNotify('حدث خطأ أثناء الحفظ.', true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleProductBadge = async (product: Product, badge: ProductBadge) => {
    setUpdatingProdId(product.id);
    const currentBadges = product.badges ?? [];
    const nextBadges = currentBadges.includes(badge)
      ? currentBadges.filter((b) => b !== badge)
      : [...currentBadges, badge];

    try {
      const res = await ownerFetch(`/api/owner/products/${encodeURIComponent(product.id)}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...product,
          badges: nextBadges,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        onNotify(data?.error || 'تعذر تحديث شارات المنتج.', true);
        return;
      }
      await onRefreshWorkspace();
      onNotify(`تم تحديث تصنيف "${product.name}".`);
    } catch {
      onNotify('حدث خطأ أثناء تحديث المنتج.', true);
    } finally {
      setUpdatingProdId(null);
    }
  };

  const filteredProducts = products.filter((p) => {
    const q = searchFilter.trim().toLowerCase();
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      p.model.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8 text-right">
      {/* Homepage Texts & Sections Visibility */}
      <form
        onSubmit={handleSaveContent}
        className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="font-display text-xl font-bold text-slate-950">
              محتوى الصفحة الرئيسية والنصوص التعريفية
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              تحكم في العناوين والوصف وأداة ترشيح المعدات وظهور الأقسام في الصفحة الرئيسية.
            </p>
          </div>
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-sm font-bold disabled:opacity-60"
          >
            <Save className="w-4 h-4" aria-hidden="true" />
            <span>{isSaving ? 'جاري الحفظ...' : 'حفظ التغييرات'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-slate-800">الشعار التعريفي (Slogan)</span>
            <input
              type="text"
              value={form.slogan}
              onChange={(e) => setForm({ ...form, slogan: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-slate-800">عنوان الصفحة الرئيسية</span>
            <input
              type="text"
              value={form.heroHeadline}
              onChange={(e) => setForm({ ...form, heroHeadline: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900"
            />
          </label>

          <label className="block space-y-1.5 md:col-span-2">
            <span className="text-sm font-semibold text-slate-800">النص التوضيحي الرئيسي</span>
            <textarea
              rows={2}
              value={form.heroSubheadline}
              onChange={(e) => setForm({ ...form, heroSubheadline: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-slate-800">عنوان أداة اكتشاف المعدات</span>
            <input
              type="text"
              value={form.finderTitle}
              onChange={(e) => setForm({ ...form, finderTitle: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-slate-800">وصف أداة اكتشاف المعدات</span>
            <input
              type="text"
              value={form.finderDescription}
              onChange={(e) => setForm({ ...form, finderDescription: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-slate-800">عنوان قسم منهجية المراجعة</span>
            <input
              type="text"
              value={form.methodologyTitle}
              onChange={(e) => setForm({ ...form, methodologyTitle: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-slate-800">وصف قسم منهجية المراجعة</span>
            <input
              type="text"
              value={form.methodologySubtitle}
              onChange={(e) => setForm({ ...form, methodologySubtitle: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900"
            />
          </label>
        </div>

        {/* Section Visibility Toggles */}
        <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() =>
              setForm({ ...form, showFeaturedSection: !form.showFeaturedSection })
            }
            className={`flex items-center justify-between p-4 rounded-xl border text-right transition-colors ${
              form.showFeaturedSection
                ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}
          >
            <div>
              <p className="text-sm font-bold">قسم الترشيحات المختارة والعروض</p>
              <p className="text-xs opacity-80 mt-0.5">
                عرض المنتجات المميزة والأكثر طلباً وأفضل قيمة في الرئيسية
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold shrink-0">
              {form.showFeaturedSection ? (
                <>
                  <Eye className="w-4 h-4 text-emerald-700" aria-hidden="true" />
                  <span>ظاهر</span>
                </>
              ) : (
                <>
                  <EyeOff className="w-4 h-4 text-slate-400" aria-hidden="true" />
                  <span>مخفي</span>
                </>
              )}
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              setForm({ ...form, showArticlesSection: !form.showArticlesSection })
            }
            className={`flex items-center justify-between p-4 rounded-xl border text-right transition-colors ${
              form.showArticlesSection
                ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}
          >
            <div>
              <p className="text-sm font-bold">قسم المقالات وأدلة الشراء</p>
              <p className="text-xs opacity-80 mt-0.5">
                إظهار أحدث المقالات المنشورة في الصفحة الرئيسية
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold shrink-0">
              {form.showArticlesSection ? (
                <>
                  <Eye className="w-4 h-4 text-emerald-700" aria-hidden="true" />
                  <span>ظاهر</span>
                </>
              ) : (
                <>
                  <EyeOff className="w-4 h-4 text-slate-400" aria-hidden="true" />
                  <span>مخفي</span>
                </>
              )}
            </span>
          </button>
        </div>
      </form>

      {/* Curate Product Badges / Featured / Popular / Discounted */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-bold text-slate-950">
              إدارة المنتجات المميزة والأكثر طلباً والعروض
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              فعل أو ألغِ تفعيل الشارات لكل منتج ليظهر في قسم الترشيحات المختارة بالصفحة الرئيسية.
            </p>
          </div>
          <input
            type="search"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="تصفية بالاسم أو الماركة..."
            className="w-full sm:w-72 rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900"
          />
        </div>

        <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
          {filteredProducts.map((product) => {
            const activeBadges = product.badges ?? [];
            const isUpdating = updatingProdId === product.id;

            return (
              <div
                key={product.id}
                className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white"
              >
                <div className="min-w-0 space-y-0.5">
                  <p className="text-sm font-bold text-slate-950 truncate">{product.name}</p>
                  <p className="text-xs text-slate-500 tabular-nums">
                    <span dir="ltr" className="font-latin">
                      {product.brand}
                    </span>{' '}
                    · {formatEgpPrice(product.verifiedPriceEgp)}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {CURATION_BADGES.map((badge) => {
                    const selected = activeBadges.includes(badge);
                    return (
                      <button
                        key={badge}
                        type="button"
                        disabled={isUpdating}
                        onClick={() => handleToggleProductBadge(product, badge)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors disabled:opacity-50 ${
                          selected
                            ? 'bg-amber-700 border-amber-700 text-white'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        {selected && <Check className="w-3.5 h-3.5" aria-hidden="true" />}
                        <span>{BADGE_LABELS[badge]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
