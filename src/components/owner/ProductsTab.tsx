import { ChangeEvent, FormEvent, useMemo, useState } from 'react';
import { Edit3, Plus, Trash2, Upload, X } from 'lucide-react';
import {
  BADGE_LABELS,
  buildAmazonEgyptUrl,
  formatEgpPrice,
  STUDIO_IMAGE_PRESETS,
} from '../../data/catalog';
import {
  AvailabilityStatus,
  MainCategory,
  Product,
  ProductBadge,
} from '../../types/catalog';
import { ownerFetch } from '../../utils/ownerApi';
import { ResilientImage } from '../ResilientImage';

interface ProductsTabProps {
  categories: MainCategory[];
  products: Product[];
  onRefreshWorkspace: () => Promise<void>;
  onNotify: (msg: string, isError?: boolean) => void;
}

const ALL_BADGES: ProductBadge[] = ['popular', 'new', 'discounted', 'best_value', 'featured'];

function createEmptyProduct(category: MainCategory): Product {
  const defaultSub = category.subcategories[0]?.id ?? '';
  return {
    id: `prod_${Date.now()}`,
    categoryId: category.id,
    subcategoryId: defaultSub,
    name: '',
    brand: '',
    model: '',
    asin: '',
    affiliateUrl: '',
    image: category.image,
    galleryImages: [category.image],
    description: '',
    editorialNote: '',
    specs: [{ label: '', value: '' }],
    advantages: [''],
    disadvantages: [''],
    verifiedPriceEgp: 0,
    originalPriceEgp: undefined,
    priceVerifiedDate: 'محقق في نوفمبر 2026',
    availability: AvailabilityStatus.IN_STOCK,
    availabilityText: 'متاح للشراء على أمازون مصر',
    usageLevels: ['beginner', 'intermediate'],
    priorities: ['value', 'daily'],
    badges: [],
    displayOrder: 1,
    isEnabled: true,
  };
}

export function ProductsTab({
  categories,
  products,
  onRefreshWorkspace,
  onNotify,
}: ProductsTabProps) {
  const [filterCatId, setFilterCatId] = useState<string>('all');
  const [filterSubId, setFilterSubId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [editingProd, setEditingProd] = useState<Product | null>(null);
  const [isNewProd, setIsNewProd] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const activeFilterCat = categories.find((c) => c.id === filterCatId);

  const visibleProducts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return products.filter((p) => {
      if (filterCatId !== 'all' && p.categoryId !== filterCatId) return false;
      if (filterSubId !== 'all' && p.subcategoryId !== filterSubId) return false;
      if (
        q &&
        !p.name.toLowerCase().includes(q) &&
        !p.brand.toLowerCase().includes(q) &&
        !p.asin.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [products, filterCatId, filterSubId, searchTerm]);

  const handleMultiImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0 || !editingProd) return;
    setIsUploading(true);

    try {
      const uploadedUrls: string[] = [];
      for (const file of files) {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error('فشل قراءة الصورة'));
          reader.readAsDataURL(file);
        });

        const res = await ownerFetch('/api/owner/upload-image', {
          method: 'POST',
          body: JSON.stringify({ filename: file.name, dataUrl }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data?.imageUrl) {
          uploadedUrls.push(data.imageUrl);
        }
      }

      if (uploadedUrls.length > 0) {
        const currentGallery = editingProd.galleryImages ?? (editingProd.image ? [editingProd.image] : []);
        const nextGallery = [...currentGallery, ...uploadedUrls];
        setEditingProd({
          ...editingProd,
          image: nextGallery[0],
          galleryImages: nextGallery,
        });
        onNotify(`تم رفع ${uploadedUrls.length} صورة للمنتج بنجاح.`);
      }
    } catch {
      onNotify('حدث خطأ أثناء رفع الصور.', true);
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  const handleSaveProduct = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingProd) return;

    if (!editingProd.name.trim() || !editingProd.brand.trim() || !editingProd.subcategoryId) {
      onNotify('يرجى إدخال اسم المنتج والماركة والقسم الفرعي.', true);
      return;
    }

    const cleanAsin = editingProd.asin.trim() || 'B0CUSTOM01';
    const cleanUrl = editingProd.affiliateUrl.trim() || buildAmazonEgyptUrl(cleanAsin);
    const gallery =
      editingProd.galleryImages && editingProd.galleryImages.length > 0
        ? editingProd.galleryImages
        : [editingProd.image];

    const availabilityText =
      editingProd.availability === AvailabilityStatus.IN_STOCK
        ? 'متاح للشراء على أمازون مصر'
        : editingProd.availability === AvailabilityStatus.LIMITED_STOCK
          ? 'كمية محدودة — متاح حالياً على أمازون مصر'
          : 'غير متاح حالياً';

    const payload: Product = {
      ...editingProd,
      name: editingProd.name.trim(),
      brand: editingProd.brand.trim(),
      model: editingProd.model.trim() || editingProd.name.trim(),
      asin: cleanAsin,
      affiliateUrl: cleanUrl,
      image: gallery[0],
      galleryImages: gallery,
      specs: editingProd.specs.filter((s) => s.label.trim() && s.value.trim()),
      advantages: editingProd.advantages.map((a) => a.trim()).filter(Boolean),
      disadvantages: editingProd.disadvantages.map((d) => d.trim()).filter(Boolean),
      availabilityText,
    };

    setIsSaving(true);
    try {
      const url = isNewProd
        ? '/api/owner/products'
        : `/api/owner/products/${encodeURIComponent(payload.id)}`;
      const method = isNewProd ? 'POST' : 'PUT';
      const res = await ownerFetch(url, {
        method,
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        onNotify(data?.error || 'تعذر حفظ المنتج.', true);
        return;
      }

      await onRefreshWorkspace();
      setEditingProd(null);
      onNotify(
        isNewProd
          ? 'تمت إضافة المنتج وظهوره في القسم المحدد.'
          : 'تم تحديث بيانات المنتج في الموقع العام.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!confirmDeleteId) return;
    setIsSaving(true);
    try {
      const res = await ownerFetch(
        `/api/owner/products/${encodeURIComponent(confirmDeleteId)}`,
        { method: 'DELETE' }
      );
      if (res.ok) {
        await onRefreshWorkspace();
        onNotify('تم حذف المنتج من قاعدة البيانات والموقع العام.');
      } else {
        onNotify('فشل حذف المنتج.', true);
      }
    } finally {
      setIsSaving(false);
      setConfirmDeleteId(null);
    }
  };

  const toggleBadge = (badge: ProductBadge) => {
    if (!editingProd) return;
    const current = editingProd.badges ?? [];
    const next = current.includes(badge)
      ? current.filter((b) => b !== badge)
      : [...current, badge];
    setEditingProd({ ...editingProd, badges: next });
  };

  return (
    <div className="space-y-6 text-right">
      {/* Filter & Add Product Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <select
            aria-label="تصفية بالقسم الرئيسي"
            value={filterCatId}
            onChange={(e) => {
              setFilterCatId(e.target.value);
              setFilterSubId('all');
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
          >
            <option value="all">كل الأقسام الرئيسية ({categories.length})</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.title}
              </option>
            ))}
          </select>

          <select
            aria-label="تصفية بالقسم الفرعي"
            value={filterSubId}
            disabled={filterCatId === 'all'}
            onChange={(e) => setFilterSubId(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 disabled:opacity-50"
          >
            <option value="all">كل الأقسام الفرعية</option>
            {activeFilterCat?.subcategories.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.title}
              </option>
            ))}
          </select>

          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث بالاسم أو الماركة أو ASIN..."
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm w-56"
          />
        </div>

        <button
          type="button"
          onClick={() => {
            const targetCat =
              (filterCatId !== 'all'
                ? categories.find((c) => c.id === filterCatId)
                : categories[0]) ?? categories[0];
            if (!targetCat) {
              onNotify('أضف قسماً رئيسياً أولاً.', true);
              return;
            }
            const draft = createEmptyProduct(targetCat);
            if (filterSubId !== 'all') draft.subcategoryId = filterSubId;
            setIsNewProd(true);
            setEditingProd(draft);
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-sm font-bold"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          <span>إضافة منتج جديد</span>
        </button>
      </div>

      {/* Product Rows */}
      <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden">
        {visibleProducts.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            لا توجد منتجات مطابقة للتصفية الحالية.
          </div>
        ) : (
          visibleProducts.map((prod) => {
            const cat = categories.find((c) => c.id === prod.categoryId);
            const sub = cat?.subcategories.find((s) => s.id === prod.subcategoryId);

            return (
              <div
                key={prod.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-20 h-16 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                    <ResilientImage
                      src={prod.image}
                      alt={prod.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <h3 className="font-display font-bold text-slate-950 truncate">
                      {prod.name}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {cat?.title} / {sub?.title ?? 'غير مصنف'} · ترتيب #{prod.displayOrder ?? 1} ·{' '}
                      <span dir="ltr" className="font-latin">
                        {prod.asin}
                      </span>
                    </p>
                    <p className="text-sm font-bold text-amber-800 tabular-nums">
                      {formatEgpPrice(prod.verifiedPriceEgp)}
                      {prod.badges && prod.badges.length > 0 && (
                        <span className="font-normal text-xs text-slate-600 mr-2">
                          · {prod.badges.map((b) => BADGE_LABELS[b]).join(' / ')}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setIsNewProd(false);
                      setEditingProd({
                        ...prod,
                        galleryImages: prod.galleryImages ?? [prod.image],
                        specs:
                          prod.specs.length > 0
                            ? prod.specs.map((s) => ({ ...s }))
                            : [{ label: '', value: '' }],
                        advantages: prod.advantages.length > 0 ? [...prod.advantages] : [''],
                        disadvantages:
                          prod.disadvantages.length > 0 ? [...prod.disadvantages] : [''],
                        badges: prod.badges ? [...prod.badges] : [],
                      });
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>تعديل / نقل</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(prod.id)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-rose-200 text-xs sm:text-sm font-medium text-rose-700 hover:bg-rose-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>حذف</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* PRODUCT EDITOR MODAL */}
      {editingProd && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleSaveProduct}
            className="w-full max-w-3xl max-h-[90vh] bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-display text-lg font-bold text-slate-950">
                {isNewProd ? 'إضافة منتج جديد' : 'تعديل أو نقل المنتج'}
              </h3>
              <button
                type="button"
                onClick={() => setEditingProd(null)}
                className="p-1.5 text-slate-500 hover:text-slate-950"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-sm">
              {/* Category & Subcategory Assignment (Supports Moving Product!) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block space-y-1.5">
                  <span className="font-semibold text-slate-800">القسم الرئيسي</span>
                  <select
                    value={editingProd.categoryId}
                    onChange={(e) => {
                      const nextCat = categories.find((c) => c.id === e.target.value);
                      setEditingProd({
                        ...editingProd,
                        categoryId: e.target.value,
                        subcategoryId: nextCat?.subcategories[0]?.id ?? '',
                      });
                    }}
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
                  <span className="font-semibold text-slate-800">القسم الفرعي</span>
                  <select
                    value={editingProd.subcategoryId}
                    onChange={(e) =>
                      setEditingProd({ ...editingProd, subcategoryId: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  >
                    {(
                      categories.find((c) => c.id === editingProd.categoryId)?.subcategories ?? []
                    ).map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.title}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <label className="block space-y-1.5 sm:col-span-3">
                  <span className="font-semibold text-slate-800">اسم المنتج</span>
                  <input
                    type="text"
                    required
                    value={editingProd.name}
                    onChange={(e) => setEditingProd({ ...editingProd, name: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="font-semibold text-slate-800">الماركة</span>
                  <input
                    type="text"
                    required
                    value={editingProd.brand}
                    onChange={(e) => setEditingProd({ ...editingProd, brand: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="font-semibold text-slate-800">الموديل</span>
                  <input
                    type="text"
                    value={editingProd.model}
                    onChange={(e) => setEditingProd({ ...editingProd, model: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="font-semibold text-slate-800">ASIN</span>
                  <input
                    type="text"
                    dir="ltr"
                    value={editingProd.asin}
                    onChange={(e) => {
                      const nextAsin = e.target.value;
                      setEditingProd({
                        ...editingProd,
                        asin: nextAsin,
                        affiliateUrl: nextAsin.trim()
                          ? buildAmazonEgyptUrl(nextAsin.trim())
                          : editingProd.affiliateUrl,
                      });
                    }}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-latin"
                  />
                </label>
              </div>

              {/* Price, Original Price, Availability, Order */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <label className="block space-y-1.5">
                  <span className="font-semibold text-slate-800">السعر الحالي (ج.م)</span>
                  <input
                    type="number"
                    min={0}
                    required
                    value={editingProd.verifiedPriceEgp}
                    onChange={(e) =>
                      setEditingProd({ ...editingProd, verifiedPriceEgp: Number(e.target.value) })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 tabular-nums"
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="font-semibold text-slate-800">السعر قبل الخصم (اختياري)</span>
                  <input
                    type="number"
                    min={0}
                    value={editingProd.originalPriceEgp ?? ''}
                    onChange={(e) =>
                      setEditingProd({
                        ...editingProd,
                        originalPriceEgp: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 tabular-nums"
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="font-semibold text-slate-800">حالة التوفر</span>
                  <select
                    value={editingProd.availability}
                    onChange={(e) =>
                      setEditingProd({
                        ...editingProd,
                        availability: e.target.value as AvailabilityStatus,
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  >
                    <option value={AvailabilityStatus.IN_STOCK}>متاح على أمازون مصر</option>
                    <option value={AvailabilityStatus.LIMITED_STOCK}>كمية محدودة</option>
                    <option value={AvailabilityStatus.OUT_OF_STOCK}>غير متاح حالياً</option>
                  </select>
                </label>

                <label className="block space-y-1.5">
                  <span className="font-semibold text-slate-800">ترتيب العرض</span>
                  <input
                    type="number"
                    min={0}
                    value={editingProd.displayOrder ?? 1}
                    onChange={(e) =>
                      setEditingProd({ ...editingProd, displayOrder: Number(e.target.value) })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 tabular-nums"
                  />
                </label>
              </div>

              <label className="block space-y-1.5">
                <span className="font-semibold text-slate-800">رابط أمازون مصر (Affiliate URL)</span>
                <input
                  type="url"
                  dir="ltr"
                  required
                  value={editingProd.affiliateUrl}
                  onChange={(e) =>
                    setEditingProd({ ...editingProd, affiliateUrl: e.target.value })
                  }
                  placeholder="https://www.amazon.eg/dp/..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-latin"
                />
              </label>

              {/* Badges (Popular, New, Discounted, Best Value, Featured) */}
              <div className="space-y-2">
                <span className="font-semibold text-slate-800 block">تصنيفات المنتج</span>
                <div className="flex flex-wrap gap-2">
                  {ALL_BADGES.map((badge) => {
                    const active = (editingProd.badges ?? []).includes(badge);
                    return (
                      <button
                        key={badge}
                        type="button"
                        onClick={() => toggleBadge(badge)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                          active
                            ? 'bg-amber-700 text-white border-amber-700'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {BADGE_LABELS[badge]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Multiple Product Images Gallery */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-slate-800">
                    صور المنتج ({(editingProd.galleryImages ?? [editingProd.image]).length})
                  </span>
                  <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold cursor-pointer hover:bg-slate-800">
                    <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{isUploading ? 'جاري الرفع...' : 'رفع صورة أو عدة صور'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="sr-only"
                      onChange={handleMultiImageUpload}
                    />
                  </label>
                </div>

                <div className="flex flex-wrap gap-3">
                  {(editingProd.galleryImages ?? [editingProd.image]).map((imgUrl, idx) => (
                    <div
                      key={`${imgUrl}-${idx}`}
                      className="relative w-20 h-16 rounded-lg overflow-hidden border border-slate-300 bg-white"
                    >
                      <ResilientImage
                        src={imgUrl}
                        alt={`صورة ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {(editingProd.galleryImages?.length ?? 1) > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const next = (editingProd.galleryImages ?? []).filter(
                              (_, i) => i !== idx
                            );
                            setEditingProd({
                              ...editingProd,
                              image: next[0],
                              galleryImages: next,
                            });
                          }}
                          aria-label="إزالة الصورة"
                          className="absolute top-0.5 left-0.5 bg-slate-950/75 text-white rounded-full p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <select
                  aria-label="إضافة صورة من مكتبة الاستوديو"
                  value=""
                  onChange={(e) => {
                    if (!e.target.value) return;
                    const current = editingProd.galleryImages ?? [editingProd.image];
                    const next = [...current, e.target.value];
                    setEditingProd({
                      ...editingProd,
                      image: next[0],
                      galleryImages: next,
                    });
                  }}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs"
                >
                  <option value="">+ إضافة صورة من صور الاستوديو الجاهزة...</option>
                  {STUDIO_IMAGE_PRESETS.map((p) => (
                    <option key={p.url} value={p.url}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <label className="block space-y-1.5">
                <span className="font-semibold text-slate-800">وصف المنتج</span>
                <textarea
                  rows={3}
                  value={editingProd.description}
                  onChange={(e) =>
                    setEditingProd({ ...editingProd, description: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>

              {/* Specifications */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800">المواصفات</span>
                  <button
                    type="button"
                    onClick={() =>
                      setEditingProd({
                        ...editingProd,
                        specs: [...editingProd.specs, { label: '', value: '' }],
                      })
                    }
                    className="text-xs font-semibold text-amber-800 hover:underline"
                  >
                    + إضافة مواصفة
                  </button>
                </div>
                {editingProd.specs.map((spec, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2">
                    <input
                      type="text"
                      placeholder="المواصفة"
                      value={spec.label}
                      onChange={(e) => {
                        const next = [...editingProd.specs];
                        next[idx] = { ...next[idx], label: e.target.value };
                        setEditingProd({ ...editingProd, specs: next });
                      }}
                      className="col-span-5 rounded-lg border border-slate-300 px-3 py-1.5"
                    />
                    <input
                      type="text"
                      placeholder="القيمة"
                      value={spec.value}
                      onChange={(e) => {
                        const next = [...editingProd.specs];
                        next[idx] = { ...next[idx], value: e.target.value };
                        setEditingProd({ ...editingProd, specs: next });
                      }}
                      className="col-span-6 rounded-lg border border-slate-300 px-3 py-1.5"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const next = editingProd.specs.filter((_, i) => i !== idx);
                        setEditingProd({
                          ...editingProd,
                          specs: next.length > 0 ? next : [{ label: '', value: '' }],
                        });
                      }}
                      className="col-span-1 flex items-center justify-center text-slate-400 hover:text-rose-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block space-y-1.5">
                  <span className="font-semibold text-slate-800">المميزات (كل سطر ميزة)</span>
                  <textarea
                    rows={3}
                    value={editingProd.advantages.join('\n')}
                    onChange={(e) =>
                      setEditingProd({ ...editingProd, advantages: e.target.value.split('\n') })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="font-semibold text-slate-800">العيوب (كل سطر عيب)</span>
                  <textarea
                    rows={3}
                    value={editingProd.disadvantages.join('\n')}
                    onChange={(e) =>
                      setEditingProd({
                        ...editingProd,
                        disadvantages: e.target.value.split('\n'),
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </label>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingProd(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-sm font-medium text-slate-700"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-sm font-bold disabled:opacity-50"
              >
                {isSaving ? 'جاري الحفظ...' : 'حفظ المنتج'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DELETE PRODUCT CONFIRMATION */}
      {confirmDeleteId && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-6 shadow-2xl space-y-4">
            <h3 className="font-display text-lg font-bold text-slate-950">تأكيد حذف المنتج</h3>
            <p className="text-sm text-slate-600">
              هل أنت متأكد من حذف هذا المنتج نهائياً من الموقع وقاعدة البيانات؟
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-sm font-medium text-slate-700"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleDeleteProduct}
                disabled={isSaving}
                className="px-5 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-sm font-bold"
              >
                نعم، احذف المنتج
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
