import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Search, X } from 'lucide-react';
import { formatEgpPrice } from '../data/catalog';
import { MainCategory, Product } from '../types/catalog';

interface SearchOverlayProps {
  isOpen: boolean;
  categories: MainCategory[];
  products: Product[];
  onClose: () => void;
  onSelectCategory: (categoryId: string) => void;
  onSelectProduct: (productId: string) => void;
}

export function SearchOverlay({
  isOpen,
  categories,
  products,
  onClose,
  onSelectCategory,
  onSelectProduct,
}: SearchOverlayProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const matchingCategories = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter(
      (cat) =>
        cat.title.toLowerCase().includes(q) ||
        cat.englishTitle.toLowerCase().includes(q) ||
        cat.description.toLowerCase().includes(q)
    );
  }, [categories, query]);

  const matchingProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products.slice(0, 5);
    return products
      .filter(
        (prod) =>
          prod.name.toLowerCase().includes(q) ||
          prod.brand.toLowerCase().includes(q) ||
          prod.model.toLowerCase().includes(q) ||
          prod.description.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [products, query]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-start justify-center pt-16 sm:pt-24 px-4"
      role="dialog"
      aria-modal="true"
      aria-label="البحث في اختيارك"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden text-right"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200">
          <Search className="w-5 h-5 text-slate-400 shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث باسم المنتج أو الماركة أو القسم (مثال: Logitech، ميكروفون، Anker)..."
            className="w-full text-base text-slate-900 placeholder:text-slate-400 focus:outline-none bg-transparent"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق البحث"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto p-5 space-y-6">
          {matchingCategories.length > 0 && (
            <div className="space-y-2.5">
              <h3 className="text-xs font-semibold text-slate-500">الأقسام الرئيسية</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {matchingCategories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      onSelectCategory(cat.id);
                      onClose();
                    }}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 hover:border-amber-700 hover:bg-amber-50/40 text-right transition-colors"
                  >
                    <span className="font-semibold text-sm text-slate-900">{cat.title}</span>
                    <ArrowLeft className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2.5">
            <h3 className="text-xs font-semibold text-slate-500">
              {query.trim() ? 'المنتجات المطابقة' : 'منتجات مقترحة'}
            </h3>
            {matchingProducts.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">
                لا توجد نتائج مطابقة لكلمة البحث.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {matchingProducts.map((prod) => (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => {
                      onSelectProduct(prod.id);
                      onClose();
                    }}
                    className="w-full py-3 px-2 flex items-center justify-between gap-4 hover:bg-slate-50 rounded-lg text-right transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {prod.name}
                      </p>
                      <p dir="ltr" className="font-latin text-xs text-slate-500">
                        {prod.brand} · {prod.model}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-amber-800 tabular-nums shrink-0">
                      {formatEgpPrice(prod.verifiedPriceEgp)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
