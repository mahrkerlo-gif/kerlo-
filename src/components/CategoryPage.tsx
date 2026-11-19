import { ArrowLeft, ArrowRight, ChevronLeft } from 'lucide-react';
import { MainCategory, Product } from '../types/catalog';
import { ResilientImage } from './ResilientImage';

interface CategoryPageProps {
  category: MainCategory;
  products: Product[];
  onNavigateHome: () => void;
  onSelectSubcategory: (categoryId: string, subcategoryId: string) => void;
}

export function CategoryPage({
  category,
  products,
  onNavigateHome,
  onSelectSubcategory,
}: CategoryPageProps) {
  const getSubcategoryProductCount = (subcategoryId: string) =>
    products.filter(
      (p) => p.categoryId === category.id && p.subcategoryId === subcategoryId
    ).length;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
      {/* Breadcrumb + Back Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <nav aria-label="مسار التصفح" className="flex items-center gap-2 text-sm text-slate-500">
          <button
            type="button"
            onClick={onNavigateHome}
            className="hover:text-slate-950 transition-colors duration-150"
          >
            الرئيسية
          </button>
          <ChevronLeft className="w-4 h-4 text-slate-400" aria-hidden="true" />
          <span className="font-semibold text-slate-950">{category.title}</span>
        </nav>

        <button
          type="button"
          onClick={onNavigateHome}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-950 transition-colors duration-150"
        >
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
          <span>العودة للأقسام الرئيسية</span>
        </button>
      </div>

      {/* Category Header */}
      <header className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 text-right space-y-3">
        <p dir="ltr" className="font-latin text-xs font-semibold tracking-wider text-amber-800 uppercase">
          {category.englishTitle}
        </p>
        <h1 className="font-display text-2xl sm:text-4xl font-bold text-slate-950">
          {category.title}
        </h1>
        <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-3xl">
          {category.description}
        </p>
        <div className="pt-2 text-xs sm:text-sm text-slate-500 tabular-nums">
          <span>{category.subcategories.length} أقسام فرعية متاحة</span>
          <span className="mx-2" aria-hidden="true">·</span>
          <span>اختر القسم الفرعي لعرض المنتجات والأسعار</span>
        </div>
      </header>

      {/* Subcategories Grid */}
      <section aria-labelledby="subcategories-heading" className="space-y-6">
        <h2
          id="subcategories-heading"
          className="font-display text-xl sm:text-2xl font-bold text-slate-950 text-right"
        >
          الأقسام الفرعية داخل {category.title}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {category.subcategories.map((sub) => {
            const count = getSubcategoryProductCount(sub.id);
            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => onSelectSubcategory(category.id, sub.id)}
                className="group bg-white border border-slate-200 rounded-2xl overflow-hidden text-right flex flex-col hover:border-amber-700/60 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700"
              >
                <div className="aspect-[16/10] w-full bg-slate-100 overflow-hidden">
                  <ResilientImage
                    src={sub.image}
                    alt={sub.title}
                    fallbackTitle={sub.title}
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-200"
                  />
                </div>

                <div className="p-6 flex-1 flex flex-col justify-between gap-5">
                  <div className="space-y-2">
                    <h3 className="font-display text-xl font-bold text-slate-950 group-hover:text-amber-800 transition-colors duration-150">
                      {sub.title}
                    </h3>
                    <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                      {sub.description}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-sm">
                    <span className="text-slate-500 tabular-nums">
                      {count} منتجات موثقة
                    </span>
                    <span className="inline-flex items-center gap-1.5 font-semibold text-amber-800 group-hover:-translate-x-1 transition-transform duration-150">
                      <span>عرض المنتجات</span>
                      <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
