import { ArrowLeft, ArrowRight, ChevronLeft } from 'lucide-react';
import { formatEgpPrice } from '../data/catalog';
import { Article, MainCategory, Product } from '../types/catalog';
import { ResilientImage } from './ResilientImage';

interface ArticlePageProps {
  article: Article;
  category?: MainCategory;
  relatedProducts: Product[];
  onNavigateHome: () => void;
  onNavigateCategory: (categoryId: string) => void;
  onSelectProduct: (productId: string) => void;
}

export function ArticlePage({
  article,
  category,
  relatedProducts,
  onNavigateHome,
  onNavigateCategory,
  onSelectProduct,
}: ArticlePageProps) {
  const paragraphs = article.content
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10 text-right">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <nav aria-label="مسار التصفح" className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <button type="button" onClick={onNavigateHome} className="hover:text-slate-950">
            الرئيسية
          </button>
          <ChevronLeft className="w-4 h-4 text-slate-400" aria-hidden="true" />
          {category && (
            <>
              <button
                type="button"
                onClick={() => onNavigateCategory(category.id)}
                className="hover:text-slate-950"
              >
                {category.title}
              </button>
              <ChevronLeft className="w-4 h-4 text-slate-400" aria-hidden="true" />
            </>
          )}
          <span className="font-semibold text-slate-950 truncate max-w-[240px]">
            {article.title}
          </span>
        </nav>

        <button
          type="button"
          onClick={onNavigateHome}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-950"
        >
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
          <span>العودة للرئيسية</span>
        </button>
      </div>

      <article className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="h-64 sm:h-80 bg-slate-100 overflow-hidden">
          <ResilientImage
            src={article.coverImage}
            alt={article.title}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="p-6 sm:p-10 space-y-6">
          <div className="space-y-3">
            {category && (
              <button
                type="button"
                onClick={() => onNavigateCategory(category.id)}
                className="text-xs font-bold text-amber-800 hover:underline"
              >
                {category.title}
              </button>
            )}
            <h1 className="font-display text-2xl sm:text-4xl font-bold text-slate-950 leading-snug">
              {article.title}
            </h1>
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
              {article.summary}
            </p>
          </div>

          <div className="pt-6 border-t border-slate-100 space-y-4 text-base text-slate-800 leading-loose">
            {paragraphs.map((para, idx) => (
              <p key={idx}>{para}</p>
            ))}
          </div>
        </div>
      </article>

      {relatedProducts.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-display text-xl font-bold text-slate-950">
            منتجات موثقة مرتبطة بهذا الدليل
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {relatedProducts.slice(0, 4).map((prod) => (
              <button
                key={prod.id}
                type="button"
                onClick={() => onSelectProduct(prod.id)}
                className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between gap-4 text-right hover:border-amber-700/60 transition-colors"
              >
                <div className="space-y-1 min-w-0">
                  <span dir="ltr" className="font-latin text-xs text-slate-500 block">
                    {prod.brand}
                  </span>
                  <h3 className="font-display text-sm font-bold text-slate-950 line-clamp-1">
                    {prod.name}
                  </h3>
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-800 tabular-nums">
                    <span>{formatEgpPrice(prod.verifiedPriceEgp)}</span>
                    <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                  </div>
                </div>
                <div className="w-20 h-16 rounded-xl bg-slate-100 overflow-hidden shrink-0">
                  <ResilientImage
                    src={prod.image}
                    alt={prod.name}
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
