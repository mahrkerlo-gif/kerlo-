import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ExternalLink,
  RotateCcw,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { formatEgpPrice } from '../data/catalog';
import {
  BudgetBracketId,
  MainCategory,
  PriorityPreference,
  Product,
  UsageLevel,
} from '../types/catalog';
import { ResilientImage } from './ResilientImage';

interface EquipmentFinderProps {
  categories: MainCategory[];
  products: Product[];
  finderTitle?: string;
  finderDescription?: string;
  onSelectProduct: (productId: string) => void;
  onPurchaseClick: (product: Product) => void;
}

interface BudgetOption {
  id: BudgetBracketId;
  label: string;
  min: number;
  max: number;
}

const CATEGORY_OPTIONS = [
  { id: 'content-creation', label: 'معدات صناعة المحتوى والتصوير' },
  { id: 'computer-gear', label: 'معدات الكمبيوتر' },
  { id: 'laptop-gear', label: 'معدات اللابتوب' },
  { id: 'mobile-accessories', label: 'إكسسوارات وشواحن الموبايل' },
] as const;

const BUDGET_OPTIONS: BudgetOption[] = [
  { id: 'under_500', label: 'أقل من 500 جنيه', min: 0, max: 499 },
  { id: '500_1000', label: 'من 500 إلى 1,000 جنيه', min: 500, max: 1000 },
  { id: '1000_2000', label: 'من 1,000 إلى 2,000 جنيه', min: 1000, max: 2000 },
  { id: '2000_3000', label: 'من 2,000 إلى 3,000 جنيه', min: 2000, max: 3000 },
  { id: '3000_5000', label: 'من 3,000 إلى 5,000 جنيه', min: 3000, max: 5000 },
  { id: '5000_10000', label: 'من 5,000 إلى 10,000 جنيه', min: 5000, max: 10000 },
  { id: 'over_10000', label: 'أكثر من 10,000 جنيه', min: 10001, max: Number.POSITIVE_INFINITY },
];

const PRIORITY_OPTIONS: Array<{ id: PriorityPreference; label: string }> = [
  { id: 'quality', label: 'أفضل جودة' },
  { id: 'price', label: 'أفضل سعر' },
  { id: 'value', label: 'أفضل قيمة مقابل السعر' },
  { id: 'daily', label: 'منتج عملي للاستخدام اليومي' },
];

const USAGE_OPTIONS: Array<{ id: UsageLevel; label: string }> = [
  { id: 'beginner', label: 'مبتدئ' },
  { id: 'intermediate', label: 'استخدام متوسط' },
  { id: 'pro', label: 'استخدام احترافي' },
];

function inferProductUsageLevels(product: Product): UsageLevel[] {
  if (product.usageLevels && product.usageLevels.length > 0) {
    return product.usageLevels;
  }
  if (product.verifiedPriceEgp <= 1800) return ['beginner', 'intermediate'];
  if (product.verifiedPriceEgp <= 6000) return ['intermediate', 'pro'];
  return ['pro'];
}

function inferProductPriorities(product: Product): PriorityPreference[] {
  if (product.priorities && product.priorities.length > 0) {
    return product.priorities;
  }
  if (product.verifiedPriceEgp <= 1500) return ['price', 'value', 'daily'];
  if (product.verifiedPriceEgp <= 5000) return ['value', 'daily'];
  return ['quality'];
}

export function EquipmentFinder({
  categories,
  products,
  finderTitle = 'اكتشف معداتك المناسبة',
  finderDescription = 'حدد ميزانيتك وجاوب على كام سؤال بسيط، وهنرشح لك المنتجات المناسبة ليك.',
  onSelectProduct,
  onPurchaseClick,
}: EquipmentFinderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 'results'>(1);

  const categoryChoices =
    categories.length > 0
      ? categories.map((c) => ({ id: c.id, label: c.title }))
      : [...CATEGORY_OPTIONS];

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    () => categoryChoices[0]?.id ?? 'content-creation'
  );
  const [selectedBudgetId, setSelectedBudgetId] = useState<BudgetBracketId>('1000_2000');
  const [selectedPriority, setSelectedPriority] = useState<PriorityPreference>('value');
  const [selectedUsage, setSelectedUsage] = useState<UsageLevel>('beginner');

  const openFinder = () => {
    setIsOpen(true);
    setStep(1);
  };

  const resetFinder = () => {
    setStep(1);
  };

  const budgetObj =
    BUDGET_OPTIONS.find((b) => b.id === selectedBudgetId) ?? BUDGET_OPTIONS[2];
  const priorityLabel =
    PRIORITY_OPTIONS.find((p) => p.id === selectedPriority)?.label ?? '';
  const usageLabel =
    USAGE_OPTIONS.find((u) => u.id === selectedUsage)?.label ?? '';
  const categoryTitle =
    categories.find((c) => c.id === selectedCategoryId)?.title ??
    CATEGORY_OPTIONS.find((c) => c.id === selectedCategoryId)?.label ??
    '';

  const recommendationResult = useMemo(() => {
    const categoryProducts = products.filter((p) => p.categoryId === selectedCategoryId);
    const inBudget = categoryProducts.filter(
      (p) =>
        p.verifiedPriceEgp >= budgetObj.min && p.verifiedPriceEgp <= budgetObj.max
    );

    const exactBudgetMatches = inBudget.length > 0;
    const pool = exactBudgetMatches ? inBudget : categoryProducts;

    const scored = pool
      .map((product) => {
        const levels = inferProductUsageLevels(product);
        const priorities = inferProductPriorities(product);

        let score = 0;
        const matchesBudget =
          product.verifiedPriceEgp >= budgetObj.min &&
          product.verifiedPriceEgp <= budgetObj.max;
        const matchesPriority = priorities.includes(selectedPriority);
        const matchesUsage = levels.includes(selectedUsage);

        if (matchesBudget) score += 40;
        if (matchesPriority) score += 25;
        if (matchesUsage) score += 20;

        // Tie-breaker based on priority preference
        if (selectedPriority === 'price') {
          score += Math.max(0, 15 - product.verifiedPriceEgp / 1000);
        } else if (selectedPriority === 'quality') {
          score += Math.min(15, product.verifiedPriceEgp / 1000);
        } else {
          // Closest to midpoint of chosen budget
          const targetMid = Number.isFinite(budgetObj.max)
            ? (budgetObj.min + budgetObj.max) / 2
            : 15000;
          const dist = Math.abs(product.verifiedPriceEgp - targetMid);
          score += Math.max(0, 15 - dist / 1000);
        }

        // Build clear, factual Egyptian Arabic explanation referencing real product attributes
        const reasons: string[] = [];
        if (matchesBudget) {
          reasons.push(
            `سعره المحقق (${formatEgpPrice(product.verifiedPriceEgp)}) داخل ميزانيتك (${budgetObj.label})`
          );
        } else {
          reasons.push(
            `أقرب اختيار متاح في قسم ${categoryTitle} بسعر محقق (${formatEgpPrice(product.verifiedPriceEgp)})`
          );
        }

        if (matchesUsage) {
          reasons.push(`مناسب لمستوى «${usageLabel}»`);
        }

        if (matchesPriority) {
          reasons.push(`بيحقق أولويتك في «${priorityLabel}»`);
        }

        if (product.advantages[0]) {
          reasons.push(`ومن أبرز مميزاته: ${product.advantages[0]}`);
        }

        return {
          product,
          score,
          reasonText: `${reasons.join('، ')}.`,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);

    return {
      exactBudgetMatches,
      items: scored,
    };
  }, [
    products,
    selectedCategoryId,
    budgetObj,
    selectedPriority,
    selectedUsage,
    categoryTitle,
    usageLabel,
    priorityLabel,
  ]);

  return (
    <>
      {/* Compact Clickable Section immediately after Brand Name & Slogan */}
      <div className="pt-4">
        <button
          type="button"
          onClick={openFinder}
          className="group w-full max-w-2xl text-right bg-slate-50 hover:bg-amber-50/60 border border-slate-200 hover:border-amber-700/60 rounded-2xl p-5 sm:p-6 transition-all duration-150 flex items-center justify-between gap-4 shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700"
        >
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-amber-800">
              <SlidersHorizontal className="w-4 h-4 shrink-0" aria-hidden="true" />
              <h2 className="font-display text-lg sm:text-xl font-bold text-slate-950 group-hover:text-amber-800 transition-colors">
                {finderTitle}
              </h2>
            </div>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              {finderDescription}
            </p>
          </div>

          <span className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-700 group-hover:bg-amber-800 text-white text-sm font-semibold whitespace-nowrap shrink-0 transition-colors">
            <span>ابدأ الآن</span>
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          </span>
        </button>
      </div>

      {/* Interactive Recommendation Questionnaire Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="finder-modal-title"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="w-full max-w-4xl max-h-[90vh] bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-right"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4 bg-slate-50">
              <div className="space-y-0.5">
                <h2
                  id="finder-modal-title"
                  className="font-display text-lg sm:text-xl font-bold text-slate-950"
                >
                  {finderTitle}
                </h2>
                <p className="text-xs sm:text-sm text-slate-500">
                  {step === 'results'
                    ? 'ترشيحات مبنية على إجاباتك من قاعدة بيانات اختيارك الموثقة'
                    : `سؤال ${step} من 4`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="إغلاق أداة الترشيح"
                className="p-2 rounded-lg text-slate-500 hover:text-slate-950 hover:bg-slate-200/70 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-6">
              {step !== 'results' && (
                <div className="flex items-center gap-2" aria-label="تقدم الأسئلة">
                  {[1, 2, 3, 4].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setStep(num as 1 | 2 | 3 | 4)}
                      className={`h-2 flex-1 rounded-full transition-colors ${
                        step >= num ? 'bg-amber-700' : 'bg-slate-200'
                      }`}
                      aria-label={`الانتقال للسؤال ${num}`}
                    />
                  ))}
                </div>
              )}

              {/* Question 1 */}
              {step === 1 && (
                <div className="space-y-5">
                  <h3 className="font-display text-xl sm:text-2xl font-bold text-slate-950">
                    إيه نوع المعدات اللي بتدور عليها؟
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {categoryChoices.map((opt) => {
                      const active = selectedCategoryId === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            setSelectedCategoryId(opt.id);
                            setStep(2);
                          }}
                          className={`p-4 rounded-xl border text-right flex items-center justify-between gap-3 transition-all ${
                            active
                              ? 'border-amber-700 bg-amber-50/70 text-slate-950 ring-1 ring-amber-700'
                              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-800'
                          }`}
                        >
                          <span className="font-semibold text-base">{opt.label}</span>
                          {active && <Check className="w-4 h-4 text-amber-800 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Question 2 */}
              {step === 2 && (
                <div className="space-y-5">
                  <h3 className="font-display text-xl sm:text-2xl font-bold text-slate-950">
                    إيه ميزانيتك؟
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {BUDGET_OPTIONS.map((opt) => {
                      const active = selectedBudgetId === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            setSelectedBudgetId(opt.id);
                            setStep(3);
                          }}
                          className={`p-4 rounded-xl border text-right flex items-center justify-between gap-3 transition-all ${
                            active
                              ? 'border-amber-700 bg-amber-50/70 text-slate-950 ring-1 ring-amber-700'
                              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-800'
                          }`}
                        >
                          <span className="font-semibold text-base tabular-nums">{opt.label}</span>
                          {active && <Check className="w-4 h-4 text-amber-800 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Question 3 */}
              {step === 3 && (
                <div className="space-y-5">
                  <h3 className="font-display text-xl sm:text-2xl font-bold text-slate-950">
                    إيه أهم حاجة بالنسبالك؟
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {PRIORITY_OPTIONS.map((opt) => {
                      const active = selectedPriority === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            setSelectedPriority(opt.id);
                            setStep(4);
                          }}
                          className={`p-4 rounded-xl border text-right flex items-center justify-between gap-3 transition-all ${
                            active
                              ? 'border-amber-700 bg-amber-50/70 text-slate-950 ring-1 ring-amber-700'
                              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-800'
                          }`}
                        >
                          <span className="font-semibold text-base">{opt.label}</span>
                          {active && <Check className="w-4 h-4 text-amber-800 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Question 4 */}
              {step === 4 && (
                <div className="space-y-5">
                  <h3 className="font-display text-xl sm:text-2xl font-bold text-slate-950">
                    مستوى الاستخدام إيه؟
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    {USAGE_OPTIONS.map((opt) => {
                      const active = selectedUsage === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            setSelectedUsage(opt.id);
                            setStep('results');
                          }}
                          className={`p-4 rounded-xl border text-right flex items-center justify-between gap-3 transition-all ${
                            active
                              ? 'border-amber-700 bg-amber-50/70 text-slate-950 ring-1 ring-amber-700'
                              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-800'
                          }`}
                        >
                          <span className="font-semibold text-base">{opt.label}</span>
                          {active && <Check className="w-4 h-4 text-amber-800 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Results View with Live Answer Editors */}
              {step === 'results' && (
                <div className="space-y-6">
                  {/* Live Editable Answers Bar */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-700">
                        تعديل اختياراتك لتحديث الترشيحات فوراً:
                      </span>
                      <button
                        type="button"
                        onClick={resetFinder}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 hover:text-amber-900"
                      >
                        <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>إعادة الأسئلة خطوة بخطوة</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <label className="block space-y-1">
                        <span className="text-xs text-slate-500">نوع المعدات</span>
                        <select
                          value={selectedCategoryId}
                          onChange={(e) => setSelectedCategoryId(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm font-medium text-slate-900"
                        >
                          {CATEGORY_OPTIONS.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="block space-y-1">
                        <span className="text-xs text-slate-500">الميزانية</span>
                        <select
                          value={selectedBudgetId}
                          onChange={(e) => setSelectedBudgetId(e.target.value as BudgetBracketId)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm font-medium text-slate-900"
                        >
                          {BUDGET_OPTIONS.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="block space-y-1">
                        <span className="text-xs text-slate-500">الأهم بالنسبة لك</span>
                        <select
                          value={selectedPriority}
                          onChange={(e) => setSelectedPriority(e.target.value as PriorityPreference)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm font-medium text-slate-900"
                        >
                          {PRIORITY_OPTIONS.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="block space-y-1">
                        <span className="text-xs text-slate-500">مستوى الاستخدام</span>
                        <select
                          value={selectedUsage}
                          onChange={(e) => setSelectedUsage(e.target.value as UsageLevel)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm font-medium text-slate-900"
                        >
                          {USAGE_OPTIONS.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </div>

                  {!recommendationResult.exactBudgetMatches && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-950">
                      لا يوجد حالياً منتج في قسم «{categoryTitle}» داخل نطاق «{budgetObj.label}»
                      بالضبط في قاعدة البيانات، ولذلك نعرض لك أقرب المنتجات المتاحة فعلياً في هذا
                      القسم.
                    </div>
                  )}

                  {recommendationResult.items.length === 0 ? (
                    <div className="py-8 text-center text-slate-600 text-sm">
                      لا توجد منتجات مضافة حالياً في هذا القسم.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {recommendationResult.items.map(({ product, reasonText }) => (
                        <article
                          key={product.id}
                          className="border border-slate-200 rounded-2xl overflow-hidden bg-white"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-12 items-stretch">
                            {/* RIGHT SIDE: Info + Why Recommended + Amazon Purchase */}
                            <div className="order-2 md:order-1 md:col-span-8 p-5 flex flex-col justify-between gap-4 text-right">
                              <div className="space-y-2">
                                <p dir="ltr" className="font-latin text-xs text-slate-500">
                                  {product.brand} · {product.model}
                                </p>
                                <h4 className="font-display text-lg font-bold text-slate-950">
                                  {product.name}
                                </h4>
                                <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 border border-slate-200/70 rounded-lg p-3">
                                  <span className="font-semibold text-amber-800">سبب الترشيح: </span>
                                  {reasonText}
                                </p>
                              </div>

                              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                                <div className="space-y-0.5">
                                  <span className="font-display text-xl font-bold text-slate-950 tabular-nums block">
                                    {formatEgpPrice(product.verifiedPriceEgp)}
                                  </span>
                                  <span className="text-xs text-slate-500">
                                    {product.availabilityText}
                                  </span>
                                </div>

                                <div className="flex flex-wrap items-center gap-2.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsOpen(false);
                                      onSelectProduct(product.id);
                                    }}
                                    className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-800 hover:bg-slate-50 text-xs sm:text-sm font-semibold transition-colors"
                                  >
                                    تفاصيل المنتج
                                  </button>
                                  <a
                                    href={product.affiliateUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => onPurchaseClick(product)}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs sm:text-sm font-bold transition-colors whitespace-nowrap shrink-0"
                                  >
                                    <span>اضغط للشراء</span>
                                    <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                                  </a>
                                </div>
                              </div>
                            </div>

                            {/* LEFT SIDE: Product Image */}
                            <div className="order-1 md:order-2 md:col-span-4 bg-slate-100 min-h-[180px] overflow-hidden">
                              <ResilientImage
                                src={product.image}
                                alt={product.name}
                                fallbackTitle={product.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer Controls for Steps 1..4 */}
            {step !== 'results' && (
              <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={() => setStep((step - 1) as 1 | 2 | 3)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-200/70 transition-colors"
                  >
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    <span>السؤال السابق</span>
                  </button>
                ) : (
                  <span className="text-xs text-slate-500">اختر إجابة للانتقال تلقائياً</span>
                )}

                <button
                  type="button"
                  onClick={() => setStep('results')}
                  className="text-sm font-semibold text-amber-800 hover:text-amber-900"
                >
                  عرض النتائج الحالية
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
