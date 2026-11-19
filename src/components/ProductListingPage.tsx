import { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  ExternalLink,
  Minus,
} from 'lucide-react';
import { BADGE_LABELS, formatEgpPrice } from '../data/catalog';
import {
  AvailabilityStatus,
  MainCategory,
  Product,
  Subcategory,
} from '../types/catalog';
import { ResilientImage } from './ResilientImage';

interface ProductListingPageProps {
  category: MainCategory;
  subcategory: Subcategory;
  products: Product[];
  clickCounts: Record<string, number>;
  onNavigateHome: () => void;
  onNavigateCategory: (categoryId: string) => void;
  onSelectProduct: (productId: string) => void;
  onPurchaseClick: (product: Product) => void;
}

type AvailabilityFilter = 'all' | 'in_stock';
type PriceSort = 'default' | 'price_asc' | 'price_desc';

export function ProductListingPage({
  category,
  subcategory,
  products,
  clickCounts,
  onNavigateHome,
  onNavigateCategory,
  onSelectProduct,
  onPurchaseClick,
}: ProductListingPageProps) {
  const [availabilityFilter, setAvailabilityFilter] = useState<AvailabilityFilter>('all');
  const [priceSort, setPriceSort] = useState<PriceSort>('default');

  const visibleProducts = useMemo(() => {
    const filtered =
      availabilityFilter === 'in_stock'
        ? products.filter((p) => p.availability === AvailabilityStatus.IN_STOCK)
        : [...products];

    if (priceSort === 'price_asc') {
      filtered.sort((a, b) => a.verifiedPriceEgp - b.verifiedPriceEgp);
    } else if (priceSort === 'price_desc') {
      filtered.sort((a, b) => b.verifiedPriceEgp - a.verifiedPriceEgp);
    }

    return filtered;
  }, [products, availabilityFilter, priceSort]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
      {/* Breadcrumb + Back Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <nav aria-label="مسار التصفح" className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <button
            type="button"
            onClick={onNavigateHome}
            className="hover:text-slate-950 transition-colors duration-150"
          >
            الرئيسية
          </button>
          <ChevronLeft className="w-4 h-4 text-slate-400" aria-hidden="true" />
          <button
            type="button"
            onClick={() => onNavigateCategory(category.id)}
            className="hover:text-slate-950 transition-colors duration-150"
          >
            {category.title}
          </button>
          <ChevronLeft className="w-4 h-4 text-slate-400" aria-hidden="true" />
          <span className="font-semibold text-slate-950">{subcategory.title}</span>
        </nav>

        <button
          type="button"
          onClick={() => onNavigateCategory(category.id)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-950 transition-colors duration-150"
        >
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
          <span>العودة إلى {category.title}</span>
        </button>
      </div>

      {/* Subcategory Header & Filter Controls */}
      <header className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 text-right space-y-6">
        <div className="space-y-2">
          <p className="text-xs sm:text-sm font-medium text-amber-800">
            {category.title} · {products.length} منتجات مُراجَعة
          </p>
          <h1 className="font-display text-2xl sm:text-4xl font-bold text-slate-950">
            {subcategory.title}
          </h1>
          <p className="text-base text-slate-600 leading-relaxed max-w-3xl">
            {subcategory.description}
          </p>
          <p className="text-sm text-slate-500 pt-1">
            نصيحة اختيارك: {subcategory.buyingTip}
          </p>
        </div>

        {/* Interactive Filter & Sort Controls */}
        <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg" role="group" aria-label="تصفية التوفر">
            <button
              type="button"
              onClick={() => setAvailabilityFilter('all')}
              className={`px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                availabilityFilter === 'all'
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              جميع المنتجات
            </button>
            <button
              type="button"
              onClick={() => setAvailabilityFilter('in_stock')}
              className={`px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                availabilityFilter === 'in_stock'
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              متاح فوراً
            </button>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg" role="group" aria-label="ترتيب الأسعار">
            <button
              type="button"
              onClick={() => setPriceSort('default')}
              className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                priceSort === 'default'
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              الترشيح الموصى به
            </button>
            <button
              type="button"
              onClick={() => setPriceSort('price_asc')}
              className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                priceSort === 'price_asc'
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              الأقل سعراً
            </button>
            <button
              type="button"
              onClick={() => setPriceSort('price_desc')}
              className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                priceSort === 'price_desc'
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              الأعلى سعراً
            </button>
          </div>
        </div>
      </header>

      {/* Large Horizontal Product Cards */}
      {visibleProducts.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-3">
          <p className="text-lg font-semibold text-slate-900">
            لا توجد منتجات مطابقة للتصفية الحالية
          </p>
          <button
            type="button"
            onClick={() => setAvailabilityFilter('all')}
            className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800"
          >
            عرض كل المنتجات
          </button>
        </div>
      ) : (
        <section aria-label="قائمة المنتجات" className="flex flex-col gap-8">
          {visibleProducts.map((product) => {
            const isLimited = product.availability === AvailabilityStatus.LIMITED_STOCK;
            const isOut = product.availability === AvailabilityStatus.OUT_OF_STOCK;
            const recordedCount = clickCounts[product.id] ?? 0;

            return (
              <article
                key={product.id}
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs hover:border-slate-300 transition-colors duration-150"
              >
                {/* Desktop: Large clear image on LEFT (order-1 lg:order-2 in RTL), Product Info on RIGHT (order-2 lg:order-1) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
                  {/* RIGHT SIDE ON DESKTOP: Product Details & Purchase CTA */}
                  <div className="order-2 lg:order-1 lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between gap-6 text-right">
                    <div className="space-y-5">
                      {/* Brand, Model & Optional Product Badges (unboxed clean metadata) */}
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-slate-500">
                          <span dir="ltr" className="font-latin font-semibold text-slate-800">
                            {product.brand}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span dir="ltr" className="font-latin">
                            {product.model}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span dir="ltr" className="font-latin tabular-nums text-slate-400">
                            ASIN: {product.asin}
                          </span>
                          {product.badges &&
                            product.badges.map((badge) => (
                              <span
                                key={badge}
                                className="font-bold text-amber-800 text-xs"
                              >
                                · {BADGE_LABELS[badge]}
                              </span>
                            ))}
                        </div>

                        <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-950 leading-snug">
                          <button
                            type="button"
                            onClick={() => onSelectProduct(product.id)}
                            className="text-right hover:text-amber-800 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 rounded"
                          >
                            {product.name}
                          </button>
                        </h2>
                      </div>

                      {/* Description */}
                      <p className="text-sm sm:text-base text-slate-700 leading-relaxed">
                        {product.description}
                      </p>

                      {/* Specifications */}
                      <div className="space-y-2.5">
                        <h3 className="text-sm font-bold text-slate-900">المواصفات الأساسية</h3>
                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 bg-slate-50 border border-slate-200/70 rounded-xl p-4">
                          {product.specs.map((spec) => (
                            <div key={spec.label} className="space-y-0.5">
                              <dt className="text-xs text-slate-500">{spec.label}</dt>
                              <dd className="text-sm font-medium text-slate-900">{spec.value}</dd>
                            </div>
                          ))}
                        </dl>
                      </div>

                      {/* Advantages and Disadvantages */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-4 space-y-2">
                          <h3 className="text-sm font-bold text-emerald-800">المميزات</h3>
                          <ul className="space-y-1.5 text-sm text-slate-700">
                            {product.advantages.map((adv) => (
                              <li key={adv} className="flex items-start gap-2">
                                <Check
                                  className="w-4 h-4 text-emerald-700 shrink-0 mt-1"
                                  aria-hidden="true"
                                />
                                <span>{adv}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-4 space-y-2">
                          <h3 className="text-sm font-bold text-slate-800">العيوب</h3>
                          <ul className="space-y-1.5 text-sm text-slate-600">
                            {product.disadvantages.map((dis) => (
                              <li key={dis} className="flex items-start gap-2">
                                <Minus
                                  className="w-4 h-4 text-slate-400 shrink-0 mt-1"
                                  aria-hidden="true"
                                />
                                <span>{dis}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Verified EGP Price, Availability & Prominent Purchase CTA */}
                    <div className="pt-5 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-baseline gap-3">
                          <span className="font-display text-2xl sm:text-3xl font-bold text-slate-950 tabular-nums">
                            {formatEgpPrice(product.verifiedPriceEgp)}
                          </span>
                          {product.originalPriceEgp &&
                            product.originalPriceEgp > product.verifiedPriceEgp && (
                              <span className="text-sm text-slate-400 line-through tabular-nums">
                                {formatEgpPrice(product.originalPriceEgp)}
                              </span>
                            )}
                          <span className="text-xs text-slate-500">
                            {product.priceVerifiedDate}
                          </span>
                        </div>

                        <div
                          className={`inline-flex items-center gap-1.5 text-sm font-medium ${
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
                      </div>

                      <div className="flex flex-col sm:items-end gap-2">
                        <a
                          href={product.affiliateUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => onPurchaseClick(product)}
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold text-base transition-colors duration-150 whitespace-nowrap shrink-0 shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700"
                        >
                          <span>اضغط للشراء</span>
                          <ExternalLink className="w-4 h-4 shrink-0" aria-hidden="true" />
                        </a>

                        <div className="flex items-center justify-between sm:justify-end gap-3 text-xs text-slate-500">
                          <button
                            type="button"
                            onClick={() => onSelectProduct(product.id)}
                            className="font-medium text-slate-700 hover:text-amber-800 underline underline-offset-4 transition-colors"
                          >
                            عرض صفحة تفاصيل المنتج
                          </button>
                          {recordedCount > 0 && (
                            <span className="tabular-nums text-slate-400">
                              · تم تسجيل {recordedCount} نقرة شراء
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* LEFT SIDE ON DESKTOP: Large Clear Product Image */}
                  <div className="order-1 lg:order-2 lg:col-span-5 bg-slate-100 min-h-[280px] sm:min-h-[340px] lg:min-h-[420px] flex items-stretch overflow-hidden">
                    <button
                      type="button"
                      onClick={() => onSelectProduct(product.id)}
                      aria-label={`عرض تفاصيل ${product.name}`}
                      className="w-full h-full block group focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-amber-700"
                    >
                      <ResilientImage
                        src={product.image}
                        alt={product.name}
                        fallbackTitle={product.name}
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                      />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
