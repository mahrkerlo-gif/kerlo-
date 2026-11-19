import { ChangeEvent, FormEvent, useState } from 'react';
import {
  ArrowRight,
  ChevronLeft,
  Edit3,
  Eye,
  EyeOff,
  FolderPlus,
  Plus,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { STUDIO_IMAGE_PRESETS } from '../../data/catalog';
import { MainCategory, Product, Subcategory } from '../../types/catalog';
import { ownerFetch } from '../../utils/ownerApi';
import { ResilientImage } from '../ResilientImage';

interface CategoriesTabProps {
  categories: MainCategory[];
  products: Product[];
  onRefreshWorkspace: () => Promise<void>;
  onNotify: (msg: string, isError?: boolean) => void;
}

export function CategoriesTab({
  categories,
  products,
  onRefreshWorkspace,
  onNotify,
}: CategoriesTabProps) {
  const [openedCategoryId, setOpenedCategoryId] = useState<string | null>(null);

  const [editingCat, setEditingCat] = useState<MainCategory | null>(null);
  const [isNewCat, setIsNewCat] = useState(false);

  const [editingSub, setEditingSub] = useState<Subcategory | null>(null);
  const [isNewSub, setIsNewSub] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState<{
    type: 'category' | 'subcategory';
    id: string;
    title: string;
  } | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const openedCategory = categories.find((c) => c.id === openedCategoryId) ?? null;

  const uploadImage = async (
    event: ChangeEvent<HTMLInputElement>,
    onUrl: (url: string) => void
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('فشل قراءة الملف'));
        reader.readAsDataURL(file);
      });
      const res = await ownerFetch('/api/owner/upload-image', {
        method: 'POST',
        body: JSON.stringify({ filename: file.name, dataUrl }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.imageUrl) {
        throw new Error(data?.error || 'تعذر رفع الصورة');
      }
      onUrl(data.imageUrl);
      onNotify('تم رفع الصورة بنجاح.');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'فشل رفع الصورة', true);
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  const handleSaveCategory = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingCat || !editingCat.title.trim()) return;
    setIsSaving(true);
    try {
      const url = isNewCat
        ? '/api/owner/categories'
        : `/api/owner/categories/${encodeURIComponent(editingCat.id)}`;
      const method = isNewCat ? 'POST' : 'PUT';
      const res = await ownerFetch(url, {
        method,
        body: JSON.stringify(editingCat),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        onNotify(data?.error || 'تعذر حفظ القسم الرئيسي.', true);
        return;
      }
      await onRefreshWorkspace();
      setEditingCat(null);
      onNotify(isNewCat ? 'تمت إضافة القسم الرئيسي بنجاح.' : 'تم تحديث القسم الرئيسي بنجاح.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleCategoryEnabled = async (cat: MainCategory) => {
    const res = await ownerFetch(`/api/owner/categories/${encodeURIComponent(cat.id)}`, {
      method: 'PUT',
      body: JSON.stringify({ ...cat, isEnabled: cat.isEnabled === false }),
    });
    if (res.ok) {
      await onRefreshWorkspace();
      onNotify(cat.isEnabled === false ? 'تم تفعيل القسم الرئيسي.' : 'تم تعطيل القسم الرئيسي.');
    }
  };

  const handleSaveSubcategory = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingSub || !editingSub.title.trim()) return;
    setIsSaving(true);
    try {
      const url = isNewSub
        ? '/api/owner/subcategories'
        : `/api/owner/subcategories/${encodeURIComponent(editingSub.id)}`;
      const method = isNewSub ? 'POST' : 'PUT';
      const res = await ownerFetch(url, {
        method,
        body: JSON.stringify(editingSub),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        onNotify(data?.error || 'تعذر حفظ القسم الفرعي.', true);
        return;
      }
      await onRefreshWorkspace();
      setEditingSub(null);
      onNotify(isNewSub ? 'تمت إضافة القسم الفرعي بنجاح.' : 'تم تحديث القسم الفرعي بنجاح.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExecuteDelete = async () => {
    if (!confirmDelete) return;
    setIsSaving(true);
    try {
      const url =
        confirmDelete.type === 'category'
          ? `/api/owner/categories/${encodeURIComponent(confirmDelete.id)}`
          : `/api/owner/subcategories/${encodeURIComponent(confirmDelete.id)}`;
      const res = await ownerFetch(url, { method: 'DELETE' });
      if (res.ok) {
        if (confirmDelete.type === 'category' && openedCategoryId === confirmDelete.id) {
          setOpenedCategoryId(null);
        }
        await onRefreshWorkspace();
        onNotify('تم الحذف وتحديث الموقع العام بنجاح.');
      } else {
        onNotify('فشل تنفيذ الحذف.', true);
      }
    } finally {
      setIsSaving(false);
      setConfirmDelete(null);
    }
  };

  return (
    <div className="space-y-6 text-right">
      {/* SUBCATEGORIES VIEW INSIDE AN OPENED MAIN CATEGORY */}
      {openedCategory ? (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setOpenedCategoryId(null)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
                <span>كل الأقسام الرئيسية</span>
              </button>
              <div>
                <h2 className="font-display text-lg sm:text-xl font-bold text-slate-950">
                  الأقسام الفرعية داخل: {openedCategory.title}
                </h2>
                <p className="text-xs text-slate-500 tabular-nums">
                  {openedCategory.subcategories.length} أقسام فرعية
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsNewSub(true);
                setEditingSub({
                  id: `sub_${Date.now()}`,
                  categoryId: openedCategory.id,
                  title: '',
                  description: '',
                  image: openedCategory.image,
                  buyingTip: '',
                  displayOrder: openedCategory.subcategories.length + 1,
                  isEnabled: true,
                });
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-sm font-bold"
            >
              <FolderPlus className="w-4 h-4" aria-hidden="true" />
              <span>إضافة قسم فرعي جديد</span>
            </button>
          </div>

          {openedCategory.subcategories.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-sm text-slate-500">
              لا توجد أقسام فرعية داخل هذا القسم حتى الآن. أضف أول قسم فرعي من الزر بالأعلى.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {openedCategory.subcategories.map((sub) => {
                const subProductCount = products.filter((p) => p.subcategoryId === sub.id).length;
                return (
                  <div
                    key={sub.id}
                    className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between gap-4"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-24 h-20 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                        <ResilientImage
                          src={sub.image}
                          alt={sub.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-display text-lg font-bold text-slate-950 truncate">
                            {sub.title}
                          </h3>
                          <span className="text-xs text-slate-500 tabular-nums shrink-0">
                            ترتيب #{sub.displayOrder ?? 0}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 line-clamp-2">{sub.description}</p>
                        <p className="text-xs text-slate-500 tabular-nums">
                          {subProductCount} منتجات · {sub.isEnabled === false ? 'معطل' : 'مفعل'}
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsNewSub(false);
                          setEditingSub({ ...sub });
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>تعديل / نقل</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmDelete({
                            type: 'subcategory',
                            id: sub.id,
                            title: sub.title,
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-rose-200 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>حذف</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* MAIN CATEGORIES LIST */
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-lg sm:text-xl font-bold text-slate-950">
                إدارة الأقسام الرئيسية ({categories.length})
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                أضف أقساماً رئيسية جديدة أو عدل الترتيب والحالة أو افتح أي قسم لإدارة أقسامه الفرعية.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsNewCat(true);
                setEditingCat({
                  id: `cat_${Date.now()}`,
                  title: '',
                  englishTitle: '',
                  description: '',
                  image: STUDIO_IMAGE_PRESETS[0].url,
                  displayOrder: categories.length + 1,
                  isEnabled: true,
                  subcategories: [],
                });
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-sm font-bold"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>إضافة قسم رئيسي جديد</span>
            </button>
          </div>

          <div className="space-y-4">
            {categories.map((cat) => {
              const catProducts = products.filter((p) => p.categoryId === cat.id).length;
              const disabled = cat.isEnabled === false;

              return (
                <div
                  key={cat.id}
                  className={`bg-white border rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-5 ${
                    disabled ? 'border-slate-200 opacity-75' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="w-28 h-22 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                      <ResilientImage
                        src={cat.image}
                        alt={cat.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-lg font-bold text-slate-950">
                          {cat.title}
                        </h3>
                        <span className="text-xs text-slate-500 tabular-nums">
                          · ترتيب #{cat.displayOrder ?? 0} · {disabled ? 'معطل' : 'مفعل'}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 line-clamp-2">{cat.description}</p>
                      <p className="text-xs text-slate-500 tabular-nums">
                        {cat.subcategories.length} أقسام فرعية · {catProducts} منتجات
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setOpenedCategoryId(cat.id)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold"
                    >
                      <span>إدارة الأقسام الفرعية</span>
                      <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleCategoryEnabled(cat)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      {disabled ? (
                        <>
                          <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>تفعيل</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>تعطيل</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsNewCat(false);
                        setEditingCat({ ...cat });
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>تعديل</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setConfirmDelete({
                          type: 'category',
                          id: cat.id,
                          title: cat.title,
                        })
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-rose-200 text-xs font-medium text-rose-700 hover:bg-rose-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>حذف</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MAIN CATEGORY MODAL */}
      {editingCat && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleSaveCategory}
            className="w-full max-w-xl max-h-[90vh] bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-display text-lg font-bold text-slate-950">
                {isNewCat ? 'إضافة قسم رئيسي جديد' : 'تعديل القسم الرئيسي'}
              </h3>
              <button
                type="button"
                onClick={() => setEditingCat(null)}
                className="p-1.5 text-slate-500 hover:text-slate-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-sm">
              <label className="block space-y-1.5">
                <span className="font-semibold text-slate-800">اسم القسم بالعربية</span>
                <input
                  type="text"
                  required
                  value={editingCat.title}
                  onChange={(e) => setEditingCat({ ...editingCat, title: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="font-semibold text-slate-800">العنوان الإنجليزي الفرعي</span>
                <input
                  type="text"
                  dir="ltr"
                  value={editingCat.englishTitle}
                  onChange={(e) => setEditingCat({ ...editingCat, englishTitle: e.target.value })}
                  placeholder="e.g. Audio & Studio Gear"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-latin"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="font-semibold text-slate-800">الوصف (يظهر في الصفحة الرئيسية)</span>
                <textarea
                  rows={3}
                  value={editingCat.description}
                  onChange={(e) => setEditingCat({ ...editingCat, description: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>

              <div className="grid grid-cols-2 gap-4">
                <label className="block space-y-1.5">
                  <span className="font-semibold text-slate-800">ترتيب العرض</span>
                  <input
                    type="number"
                    min={0}
                    value={editingCat.displayOrder ?? 1}
                    onChange={(e) =>
                      setEditingCat({ ...editingCat, displayOrder: Number(e.target.value) })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 tabular-nums"
                  />
                </label>

                <label className="flex items-center gap-2 pt-7 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingCat.isEnabled !== false}
                    onChange={(e) =>
                      setEditingCat({ ...editingCat, isEnabled: e.target.checked })
                    }
                    className="w-4 h-4 accent-amber-700"
                  />
                  <span className="font-semibold text-slate-800">القسم مفعل في الموقع العام</span>
                </label>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <span className="font-semibold text-slate-800 block">صورة القسم</span>
                <div className="flex items-center gap-3">
                  <div className="w-24 h-18 rounded-lg overflow-hidden bg-white border border-slate-200 shrink-0">
                    <ResilientImage
                      src={editingCat.image}
                      alt="معاينة"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold cursor-pointer">
                      <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{isUploading ? 'جاري الرفع...' : 'رفع صورة جديدة'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(e) =>
                          uploadImage(e, (url) => setEditingCat({ ...editingCat, image: url }))
                        }
                      />
                    </label>
                    <select
                      value={editingCat.image}
                      onChange={(e) => setEditingCat({ ...editingCat, image: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                    >
                      {STUDIO_IMAGE_PRESETS.map((p) => (
                        <option key={p.url} value={p.url}>
                          {p.label}
                        </option>
                      ))}
                      {!STUDIO_IMAGE_PRESETS.some((p) => p.url === editingCat.image) && (
                        <option value={editingCat.image}>صورة مرفوعة</option>
                      )}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingCat(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-sm font-medium text-slate-700"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-sm font-bold disabled:opacity-50"
              >
                {isSaving ? 'جاري الحفظ...' : 'حفظ القسم'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SUBCATEGORY MODAL (INCLUDES MOVE TO ANOTHER MAIN CATEGORY) */}
      {editingSub && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleSaveSubcategory}
            className="w-full max-w-xl max-h-[90vh] bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-display text-lg font-bold text-slate-950">
                {isNewSub ? 'إضافة قسم فرعي جديد' : 'تعديل أو نقل القسم الفرعي'}
              </h3>
              <button
                type="button"
                onClick={() => setEditingSub(null)}
                className="p-1.5 text-slate-500 hover:text-slate-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-sm">
              <label className="block space-y-1.5">
                <span className="font-semibold text-slate-800">
                  القسم الرئيسي التابع له (يمكن نقله لقسم آخر)
                </span>
                <select
                  value={editingSub.categoryId}
                  onChange={(e) => setEditingSub({ ...editingSub, categoryId: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.title}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1.5">
                <span className="font-semibold text-slate-800">اسم القسم الفرعي</span>
                <input
                  type="text"
                  required
                  value={editingSub.title}
                  onChange={(e) => setEditingSub({ ...editingSub, title: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="font-semibold text-slate-800">الوصف</span>
                <textarea
                  rows={3}
                  value={editingSub.description}
                  onChange={(e) => setEditingSub({ ...editingSub, description: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="font-semibold text-slate-800">نصيحة الشراء</span>
                <input
                  type="text"
                  value={editingSub.buyingTip}
                  onChange={(e) => setEditingSub({ ...editingSub, buyingTip: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>

              <div className="grid grid-cols-2 gap-4">
                <label className="block space-y-1.5">
                  <span className="font-semibold text-slate-800">ترتيب العرض</span>
                  <input
                    type="number"
                    min={0}
                    value={editingSub.displayOrder ?? 1}
                    onChange={(e) =>
                      setEditingSub({ ...editingSub, displayOrder: Number(e.target.value) })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 tabular-nums"
                  />
                </label>

                <label className="flex items-center gap-2 pt-7 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingSub.isEnabled !== false}
                    onChange={(e) =>
                      setEditingSub({ ...editingSub, isEnabled: e.target.checked })
                    }
                    className="w-4 h-4 accent-amber-700"
                  />
                  <span className="font-semibold text-slate-800">مفعل</span>
                </label>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <span className="font-semibold text-slate-800 block">صورة القسم الفرعي</span>
                <div className="flex items-center gap-3">
                  <div className="w-24 h-18 rounded-lg overflow-hidden bg-white border border-slate-200 shrink-0">
                    <ResilientImage
                      src={editingSub.image}
                      alt="معاينة"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold cursor-pointer">
                      <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{isUploading ? 'جاري الرفع...' : 'رفع صورة جديدة'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(e) =>
                          uploadImage(e, (url) => setEditingSub({ ...editingSub, image: url }))
                        }
                      />
                    </label>
                    <select
                      value={editingSub.image}
                      onChange={(e) => setEditingSub({ ...editingSub, image: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                    >
                      {STUDIO_IMAGE_PRESETS.map((p) => (
                        <option key={p.url} value={p.url}>
                          {p.label}
                        </option>
                      ))}
                      {!STUDIO_IMAGE_PRESETS.some((p) => p.url === editingSub.image) && (
                        <option value={editingSub.image}>صورة مرفوعة</option>
                      )}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingSub(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-sm font-medium text-slate-700"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-sm font-bold disabled:opacity-50"
              >
                {isSaving ? 'جاري الحفظ...' : 'حفظ القسم الفرعي'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-6 shadow-2xl space-y-4">
            <h3 className="font-display text-lg font-bold text-slate-950">تأكيد الحذف</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              هل أنت متأكد من حذف «{confirmDelete.title}»؟ سيتم أيضاً إزالة{' '}
              {confirmDelete.type === 'category'
                ? 'جميع الأقسام الفرعية والمنتجات التابعة له'
                : 'جميع المنتجات التابعة له'}
              .
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-sm font-medium text-slate-700"
              >
                تراجع
              </button>
              <button
                type="button"
                onClick={handleExecuteDelete}
                disabled={isSaving}
                className="px-5 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-sm font-bold"
              >
                نعم، احذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
