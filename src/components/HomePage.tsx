import { ArrowLeft, BookOpen, Check, ExternalLink } from 'lucide-react';
import { BADGE_LABELS, formatEgpPrice } from '../data/catalog';
import { Article, MainCategory, Product, SiteSettings } from '../types/catalog';
import { EquipmentFinder } from './EquipmentFinder';
import { ResilientImage } from './ResilientImage';

interface HomePageProps {
  categories: MainCategory[];
  products: Product[];
  articles: Article[];
  settings: SiteSettings;
  selectedCategoryId: string | null;
  pendingCategoryId: string | null;
  onSelectCategory: (categoryId: string) => void;
  onSelectProduct: (productId: string) => void;
  onSelectArticle: (articleId: string) => void;
  onPurchaseClick: (product: Product) => void;
}

export function HomePage({
  categories,
  products,
  articles,
  settings,
  selectedCategoryId,
  pendingCategoryId,
  onSelectCategory,
  onSelectProduct,
  onSelectArticle,
  onPurchaseClick,
}: HomePageProps) {
  const getCategoryProductCount = (categoryId: string) =>
    products.filter((p) => p.categoryId === categoryId).length;

  const curatedProducts = products
    .filter((p) => Array.isArray(p.badges) && p.badges.length > 0)
    .slice(0, 6);

  return (
    <div className="space-y-16 pb-16">
      {/* Brand Name, Slogan, and Immediate Compact Equipment Recommendation Tool */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="max-w-3xl text-right space-y-5">
            <p className="text-xs sm:text-sm font-medium text-amber-800 tracking-wide">
              {settings.brandArabic} ·{' '}
              <span dir="ltr" className="font-latin">
                {settings.brandEnglish}
              </span>{' '}
              · {settings.slogan}
            </p>
            <h1 className="font-display text-3xl sm:text-5xl font-bold text-slate-950 leading-tight">
              {settings.heroHeadline}
            </h1>
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
              {settings.heroSubheadline}
            </p>

            {/* Compact Clickable Recommendation Tool Immediately After Brand & Slogan */}
            <EquipmentFinder
              categories={categories}
              products={products}
              finderTitle={settings.finderTitle}
              finderDescription={settings.finderDescription}
              onSelectProduct={onSelectProduct}
              onPurchaseClick={onPurchaseClick}
            />
          </div>
        </div>
      </section>

      {/* Main Category Cards Section — Horizontal RTL Cards */}
      <section
        id="main-categories"
        aria-labelledby="categories-heading"
        className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8"
      >
        <div className="text-right mb-8 space-y-2">
          <h2
            id="categories-heading"
            className="font-display text-2xl sm:text-3xl font-bold text-slate-950"
          >
            الأقسام الرئيسية
          </h2>
          <p className="text-slate-600 text-sm sm:text-base">
            اضغط على أي قسم لاستعراض الأقسام الفرعية والمنتجات الموثقة بداخله.
          </p>
        </div>

        <div className="flex flex-col gap-6">
          {categories.map((category) => {
            const isSelected =
              pendingCategoryId === category.id ||
              (pendingCategoryId === null && selectedCategoryId === category.id);
            const productCount = getCategoryProductCount(category.id);

            return (
              <button
                key={category.id}
                type="button"
                onClick={() => onSelectCategory(category.id)}
                aria-pressed={isSelected}
                className={`group w-full text-right rounded-2xl border overflow-hidden transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 ${
                  isSelected
                    ? 'bg-amber-50/60 border-amber-700 ring-2 ring-amber-700/25 shadow-md'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5'
                }`}
              >
                {/* In dir="rtl": order-2 lg:order-1 sits on RIGHT side; order-1 lg:order-2 sits on LEFT side */}
                <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
                  {/* RIGHT SIDE ON DESKTOP: Title and Egyptian Arabic Description */}
                  <div className="order-2 lg:order-1 lg:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-between gap-6 text-right">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-4">
                        <span
                          dir="ltr"
                          className="font-latin text-xs font-semibold tracking-wider text-slate-500 uppercase"
                        >
                          {category.englishTitle}
                        </span>
                        {isSelected && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800">
                            <Check className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>
                              {pendingCategoryId === category.id
                                ? 'تم اختيار القسم...'
                                : 'القسم المختار'}
                            </span>
                          </span>
                        )}
                      </div>

                      <h3 className="font-display text-2xl sm:text-3xl font-bold text-slate-950 group-hover:text-amber-800 transition-colors duration-150">
                        {category.title}
                      </h3>

                      <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-2xl">
                        {category.description}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4 text-sm text-slate-500">
                      <div className="flex items-center gap-2 tabular-nums">
                        <span>{category.subcategories.length} أقسام فرعية</span>
                        <span aria-hidden="true">·</span>
                        <span>{productCount} منتجات موثقة</span>
                      </div>
                      <span className="inline-flex items-center gap-1.5 font-semibold text-amber-800 group-hover:-translate-x-1 transition-transform duration-150">
                        <span>تصفح القسم</span>
                        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                      </span>
                    </div>
                  </div>

                  {/* LEFT SIDE ON DESKTOP: Large Category Image */}
                  <div className="order-1 lg:order-2 lg:col-span-5 bg-slate-100 min-h-[220px] sm:min-h-[260px] lg:min-h-[300px] overflow-hidden">
                    <ResilientImage
                      src={category.image}
                      alt={category.title}
                      fallbackTitle={category.title}
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Optional Curated Featured / Popular / Discounted Products Section */}
      {settings.showFeaturedSection && curatedProducts.length > 0 && (
        <section
          aria-labelledby="curated-heading"
          className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6"
        >
          <div className="text-right space-y-1.5">
            <h2
              id="curated-heading"
              className="font-display text-2xl sm:text-3xl font-bold text-slate-950"
            >
              ترشيحات مختارة من اختيارك
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              منتجات مميزة والأكثر طلباً وأفضل قيمة مقابل السعر حالياً في مصر.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {curatedProducts.map((product) => {
              const primaryBadge = product.badges?.[0];
              return (
                <article
                  key={product.id}
                  className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col justify-between text-right hover:border-slate-300 transition-colors"
                >
                  <div>
                    <button
                      type="button"
                      onClick={() => onSelectProduct(product.id)}
                      className="block w-full h-48 bg-slate-100 overflow-hidden"
                    >
                      <ResilientImage
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover hover:scale-[1.02] transition-transform duration-200"
                      />
                    </button>

                    <div className="p-5 space-y-2">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span dir="ltr" className="font-latin font-semibold text-slate-500">
                          {product.brand}
                        </span>
                        {primaryBadge && (
                          <span className="font-bold text-amber-800">
                            {BADGE_LABELS[primaryBadge]}
                          </span>
                        )}
                      </div>

                      <h3 className="font-display text-base font-bold text-slate-950 line-clamp-2">
                        <button
                          type="button"
                          onClick={() => onSelectProduct(product.id)}
                          className="text-right hover:text-amber-800 transition-colors"
                        >
                          {product.name}
                        </button>
                      </h3>

                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {product.description}
                      </p>
                    </div>
                  </div>

                  <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between gap-3">
                    <div>
                      <span className="font-display text-lg font-bold text-slate-950 tabular-nums block">
                        {formatEgpPrice(product.verifiedPriceEgp)}
                      </span>
                      {product.originalPriceEgp &&
                        product.originalPriceEgp > product.verifiedPriceEgp && (
                          <span className="text-xs text-slate-400 line-through tabular-nums">
                            {formatEgpPrice(product.originalPriceEgp)}
                          </span>
                        )}
                    </div>

                    <a
                      href={product.affiliateUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => onPurchaseClick(product)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold transition-colors whitespace-nowrap shrink-0"
                    >
                      <span>اضغط للشراء</span>
                      <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* Optional Educational Articles & Buying Guides Section */}
      {settings.showArticlesSection && articles.length > 0 && (
        <section
          aria-labelledby="articles-heading"
          className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6"
        >
          <div className="text-right space-y-1.5">
            <h2
              id="articles-heading"
              className="font-display text-2xl sm:text-3xl font-bold text-slate-950"
            >
              أدلة الشراء والمقالات
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              شروحات عملية تساعدك تقارن وتختار المعدات الأنسب لشغلك وميزانيتك.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {articles.slice(0, 4).map((article) => (
              <button
                key={article.id}
                type="button"
                onClick={() => onSelectArticle(article.id)}
                className="group bg-white border border-slate-200 rounded-2xl overflow-hidden text-right grid grid-cols-1 sm:grid-cols-12 items-stretch hover:border-amber-700/60 transition-colors"
              >
                <div className="sm:col-span-5 h-44 sm:h-auto bg-slate-100 overflow-hidden">
                  <ResilientImage
                    src={article.coverImage}
                    alt={article.title}
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-200"
                  />
                </div>
                <div className="sm:col-span-7 p-5 flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800">
                      <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>دليل شراء</span>
                    </span>
                    <h3 className="font-display text-lg font-bold text-slate-950 group-hover:text-amber-800 transition-colors">
                      {article.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 line-clamp-2 leading-relaxed">
                      {article.summary}
                    </p>
                  </div>

                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800">
                    <span>اقرأ الدليل</span>
                    <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Methodology Section */}
      <section
        id="methodology"
        aria-labelledby="methodology-heading"
        className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8"
      >
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-10">
          <div className="text-right mb-8 space-y-2">
            <h2
              id="methodology-heading"
              className="font-display text-xl sm:text-2xl font-bold text-slate-950"
            >
              {settings.methodologyTitle}
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              {settings.methodologySubtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-right">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-amber-800 tabular-nums">01. مواصفات حقيقية</p>
              <h3 className="font-display text-lg font-bold text-slate-950">
                المميزات والعيوب بوضوح
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                ما بنكتبش كلام تسويقي وبس؛ بنوضحلك المزايا العملية والعيوب اللي تاخد بالك منها قبل
                ما تدفع.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-amber-800 tabular-nums">02. أسعار محققة</p>
              <h3 className="font-display text-lg font-bold text-slate-950">
                أسعار بالجنيه وحالة التوفر
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                كل منتج معروض بسعره المحقق بالجنيه المصري وحالة التوفر الفعلية وقت المراجعة.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-amber-800 tabular-nums">03. شراء مباشر</p>
              <h3 className="font-display text-lg font-bold text-slate-950">
                توجيه دقيق لصفحة المنتج
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                زر «اضغط للشراء» بيوديك فوراً على صفحة المنتج المحددة في أمازون مصر برقم الموديل
                المضبوط.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
