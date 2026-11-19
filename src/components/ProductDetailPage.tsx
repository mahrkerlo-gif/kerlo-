import { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  ExternalLink,
  Minus,
  ShieldCheck,
} from 'lucide-react';
import { BADGE_LABELS, formatEgpPrice } from '../data/catalog';
import {
  AvailabilityStatus,
  MainCategory,
  Product,
  Subcategory,
} from '../types/catalog';
import { ResilientImage } from './ResilientImage';

interface ProductDetailPageProps {
  category: MainCategory;
  subcategory: Subcategory;
  product: Product;
  relatedProducts: Product[];
  clickCount: number;
  onNavigateHome: () => void;
  onNavigateCategory: (categoryId: string) => void;
  onNavigateSubcategory: (categoryId: string, subcategoryId: string) => void;
  onSelectProduct: (productId: string) => void;
  onPurchaseClick: (product: Product) => void;
}

export function ProductDetailPage({
  category,
  subcategory,
  product,
  relatedProducts,
  clickCount,
  onNavigateHome,
  onNavigateCategory,
  onNavigateSubcategory,
  onSelectProduct,
  onPurchaseClick,
}: ProductDetailPageProps) {
  const isLimited = product.availability === AvailabilityStatus.LIMITED_STOCK;
  const isOut = product.availability === AvailabilityStatus.OUT_OF_STOCK;
  const gallery =
    product.galleryImages && product.galleryImages.length > 0
      ? product.galleryImages
      : [product.image];
  const [activeImage, setActiveImage] = useState<string>(gallery[0]);

  useEffect(() => {
    setActiveImage(gallery[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id, product.image]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-12">
      {/* Breadcrumb + Back Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <nav aria-label="مسار التصفح" className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <button
            type="button"
            onClick={onNavigateHome}
            className="hover:text-slate-950 transition-colors"
          >
            الرئيسية
          </button>
          <ChevronLeft className="w-4 h-4 text-slate-400" aria-hidden="true" />
          <button
            type="button"
            onClick={() => onNavigateCategory(category.id)}
            className="hover:text-slate-950 transition-colors"
          >
            {category.title}
          </button>
          <ChevronLeft className="w-4 h-4 text-slate-400" aria-hidden="true" />
          <button
            type="button"
            onClick={() => onNavigateSubcategory(category.id, subcategory.id)}
            className="hover:text-slate-950 transition-colors"
          >
            {subcategory.title}
          </button>
          <ChevronLeft className="w-4 h-4 text-slate-400" aria-hidden="true" />
          <span className="font-semibold text-slate-950 truncate max-w-[220px] sm:max-w-xs">
            {product.brand} {product.model}
          </span>
        </nav>

        <button
          type="button"
          onClick={() => onNavigateSubcategory(category.id, subcategory.id)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-950 transition-colors"
        >
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
          <span>العودة إلى {subcategory.title}</span>
        </button>
      </div>

      {/* Main Contiguous Product Detail & Purchase Module */}
      <article className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          {/* RIGHT SIDE ON DESKTOP: Contiguous Product Information + Purchase CTA */}
          <div className="order-2 lg:order-1 lg:col-span-6 p-6 sm:p-10 text-right flex flex-col justify-between gap-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-slate-500">
                  <span dir="ltr" className="font-latin font-semibold text-slate-800">
                    {product.brand}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span dir="ltr" className="font-latin">
                    {product.model}
                  </span>
                  {product.badges &&
                    product.badges.map((badge) => (
                      <span key={badge} className="font-bold text-amber-800 text-xs">
                        · {BADGE_LABELS[badge]}
                      </span>
                    ))}
                </div>

                <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-950 leading-snug">
                  {product.name}
                </h1>
              </div>

              <p className="text-base text-slate-700 leading-relaxed">
                {product.description}
              </p>

              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-1">
                <p className="text-xs font-semibold text-amber-800">خلاصة رأي اختيارك</p>
                <p className="text-sm text-slate-700 leading-relaxed">{product.editorialNote}</p>
              </div>

              {/* Price & Availability Module */}
              <div className="pt-4 border-t border-slate-200 space-y-4">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <div className="space-y-1">
                    <span className="block text-xs text-slate-500">السعر الموثق في مصر</span>
                    <div className="flex flex-wrap items-baseline gap-3">
                      <span className="font-display text-3xl sm:text-4xl font-bold text-slate-950 tabular-nums">
                        {formatEgpPrice(product.verifiedPriceEgp)}
                      </span>
                      {product.originalPriceEgp &&
                        product.originalPriceEgp > product.verifiedPriceEgp && (
                          <span className="text-base text-slate-400 line-through tabular-nums">
                            {formatEgpPrice(product.originalPriceEgp)}
                          </span>
                        )}
                    </div>
                  </div>
                  <span className="text-xs text-slate-500">{product.priceVerifiedDate}</span>
                </div>

                <div
                  className={`inline-flex items-center gap-2 text-sm font-medium ${
                    isOut
                      ? 'text-rose-700'
                      : isLimited
                      ? 'text-amber-800'
                      : 'text-emerald-800'
                  }`}
                >
                  {isOut || isLimited ? (
                    <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                  )}
                  <span>{product.availabilityText}</span>
                </div>

                <div className="pt-2 space-y-2.5">
                  <a
                    href={product.affiliateUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => onPurchaseClick(product)}
                    className="w-full inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold text-lg transition-colors duration-150 shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700"
                  >
                    <span>اضغط للشراء</span>
                    <ExternalLink className="w-5 h-5 shrink-0" aria-hidden="true" />
                  </a>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-slate-400" aria-hidden="true" />
                      <span>فتح صفحة المنتج الرسمية على أمازون مصر</span>
                    </span>
                    <span dir="ltr" className="font-latin tabular-nums">
                      ASIN: {product.asin}
                      {clickCount > 0 ? ` · ${clickCount} clicks` : ''}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* LEFT SIDE ON DESKTOP: Large Clear Product Image + Gallery Thumbnails */}
          <div className="order-1 lg:order-2 lg:col-span-6 bg-slate-100 flex flex-col">
            <div className="flex-1 min-h-[320px] lg:min-h-[460px] overflow-hidden">
              <ResilientImage
                src={activeImage}
                alt={product.name}
                fallbackTitle={product.name}
                className="w-full h-full object-cover"
              />
            </div>

            {gallery.length > 1 && (
              <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 overflow-x-auto">
                {gallery.map((imgUrl, idx) => (
                  <button
                    key={`${imgUrl}_${idx}`}
                    type="button"
                    onClick={() => setActiveImage(imgUrl)}
                    className={`w-16 h-16 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${
                      activeImage === imgUrl
                        ? 'border-amber-700 ring-2 ring-amber-700/20'
                        : 'border-slate-200 opacity-75 hover:opacity-100'
                    }`}
                    aria-label={`عرض الصورة ${idx + 1}`}
                  >
                    <ResilientImage
                      src={imgUrl}
                      alt={`${product.name} ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </article>

      {/* Full Specifications + Pros & Cons */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <section className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 text-right space-y-4">
          <h2 className="font-display text-xl font-bold text-slate-950">
            المواصفات التقنية الكاملة
          </h2>
          <dl className="divide-y divide-slate-100">
            {product.specs.map((spec) => (
              <div
                key={spec.label}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1"
              >
                <dt className="text-sm text-slate-500">{spec.label}</dt>
                <dd className="text-sm font-semibold text-slate-900">{spec.value}</dd>
              </div>
            ))}
            <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <dt className="text-sm text-slate-500">رقم الموديل المعتمد</dt>
              <dd dir="ltr" className="font-latin text-sm font-semibold text-slate-900">
                {product.model}
              </dd>
            </div>
          </dl>
        </section>

        <section className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 text-right space-y-6">
          <h2 className="font-display text-xl font-bold text-slate-950">
            المميزات والعيوب بالتفصيل
          </h2>

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-emerald-800">المميزات</h3>
            <ul className="space-y-2 text-sm sm:text-base text-slate-700">
              {product.advantages.map((adv) => (
                <li key={adv} className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-700 shrink-0 mt-1" aria-hidden="true" />
                  <span>{adv}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-3">
            <h3 className="text-sm font-bold text-slate-800">العيوب</h3>
            <ul className="space-y-2 text-sm sm:text-base text-slate-600">
              {product.disadvantages.map((dis) => (
                <li key={dis} className="flex items-start gap-2.5">
                  <Minus className="w-4 h-4 text-slate-400 shrink-0 mt-1" aria-hidden="true" />
                  <span>{dis}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      {/* Related Products in the Same Subcategory */}
      {relatedProducts.length > 0 && (
        <section aria-labelledby="related-heading" className="space-y-5">
          <h2
            id="related-heading"
            className="font-display text-xl font-bold text-slate-950 text-right"
          >
            بدائل أخرى في {subcategory.title}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {relatedProducts.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectProduct(item.id)}
                className="group bg-white border border-slate-200 rounded-2xl p-5 text-right flex items-center justify-between gap-4 hover:border-amber-700/60 hover:shadow-sm transition-all"
              >
                <div className="space-y-1.5">
                  <span dir="ltr" className="font-latin text-xs text-slate-500 block">
                    {item.brand} · {item.model}
                  </span>
                  <h3 className="font-display font-bold text-slate-950 group-hover:text-amber-800 transition-colors">
                    {item.name}
                  </h3>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="font-bold text-slate-900 tabular-nums">
                      {formatEgpPrice(item.verifiedPriceEgp)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-amber-800 font-medium">
                      <span>مقارنة</span>
                      <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                    </span>
                  </div>
                </div>
                <div className="w-24 h-20 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                  <ResilientImage
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
