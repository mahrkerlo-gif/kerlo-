import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Calendar,
  Minus,
  MousePointerClick,
  RefreshCw,
  Users,
} from 'lucide-react';
import { AnalyticsSummary } from '../../types/catalog';
import { ownerFetch } from '../../utils/ownerApi';
import { CandlestickChart } from '../CandlestickChart';

function getTodayIso(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function addDaysIso(iso: string, delta: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + delta));
  return dt.toISOString().slice(0, 10);
}

function TrendBadge({
  direction,
  percent,
  compareLabel,
}: {
  direction: 'up' | 'down' | 'flat';
  percent: number;
  compareLabel: string;
}) {
  if (direction === 'up') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 tabular-nums">
        <ArrowUp className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>+{percent}%</span>
        <span className="text-slate-500 font-normal">{compareLabel}</span>
      </span>
    );
  }
  if (direction === 'down') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 tabular-nums">
        <ArrowDown className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{percent}%</span>
        <span className="text-slate-500 font-normal">{compareLabel}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 tabular-nums">
      <Minus className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>0%</span>
      <span className="font-normal">{compareLabel}</span>
    </span>
  );
}

export function AnalyticsTab() {
  const today = getTodayIso();
  const [startDate, setStartDate] = useState<string>(() => addDaysIso(today, -13));
  const [endDate, setEndDate] = useState<string>(today);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = useCallback(async (start: string, end: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ startDate: start, endDate: end });
      const res = await ownerFetch(`/api/owner/analytics?${qs.toString()}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        setError(data?.error || 'تعذر تحميل الإحصائيات.');
        return;
      }
      setSummary(data.summary);
    } catch {
      setError('تعذر الاتصال بخادم الإحصائيات.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics(startDate, endDate);
  }, [startDate, endDate, loadAnalytics]);

  const applyPreset = (daysBack: number) => {
    const t = getTodayIso();
    setEndDate(t);
    setStartDate(addDaysIso(t, -daysBack));
  };

  if (error) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-right space-y-3">
        <p className="text-sm font-semibold text-rose-900">{error}</p>
        <button
          type="button"
          onClick={() => loadAnalytics(startDate, endDate)}
          className="px-4 py-2 rounded-lg bg-rose-700 text-white text-xs font-semibold"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 text-right">
      {/* Custom Date Range Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-2 text-sm font-bold text-slate-900">
            <Calendar className="w-4 h-4 text-amber-800" aria-hidden="true" />
            <span>نطاق التاريخ:</span>
          </div>

          <label className="inline-flex items-center gap-2 text-xs sm:text-sm text-slate-600">
            <span>من</span>
            <input
              type="date"
              value={startDate}
              max={endDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs sm:text-sm tabular-nums text-slate-900"
            />
          </label>

          <label className="inline-flex items-center gap-2 text-xs sm:text-sm text-slate-600">
            <span>إلى</span>
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs sm:text-sm tabular-nums text-slate-900"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => applyPreset(0)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700"
          >
            اليوم
          </button>
          <button
            type="button"
            onClick={() => applyPreset(6)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700"
          >
            آخر 7 أيام
          </button>
          <button
            type="button"
            onClick={() => applyPreset(13)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700"
          >
            آخر 14 يوم
          </button>
          <button
            type="button"
            onClick={() => applyPreset(29)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700"
          >
            آخر 30 يوم
          </button>
          <button
            type="button"
            onClick={() => loadAnalytics(startDate, endDate)}
            aria-label="تحديث البيانات"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>تحديث</span>
          </button>
        </div>
      </div>

      {!summary ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-slate-200/70 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* SECTION A: WEBSITE VISITORS */}
          <section aria-labelledby="visitors-analytics-heading" className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Users className="w-5 h-5 text-amber-800" aria-hidden="true" />
                <h2
                  id="visitors-analytics-heading"
                  className="font-display text-xl font-bold text-slate-950"
                >
                  أ. إحصائيات زوار الموقع (بيانات فعلية مسجلة)
                </h2>
              </div>
              <TrendBadge
                direction={summary.visitors.trendDirection}
                percent={summary.visitors.changePercent}
                compareLabel={`مقارنة بالفترة السابقة (${summary.visitors.previousRangeVisitors} زائر)`}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-1.5">
                <span className="text-xs text-slate-500">إجمالي الزيارات (الجلسات)</span>
                <p className="font-display text-2xl sm:text-3xl font-bold text-slate-950 tabular-nums">
                  {summary.visitors.totalVisits}
                </p>
                <span className="text-xs text-slate-500 tabular-nums">
                  زوار النطاق المحدد: {summary.visitors.visitorsInRange}
                </span>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-1.5">
                <span className="text-xs text-slate-500">الزوار الفريدون</span>
                <p className="font-display text-2xl sm:text-3xl font-bold text-slate-950 tabular-nums">
                  {summary.visitors.uniqueVisitors}
                </p>
                <TrendBadge
                  direction={summary.visitors.trendDirection}
                  percent={summary.visitors.changePercent}
                  compareLabel="عن الفترة السابقة"
                />
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-1.5">
                <span className="text-xs text-slate-500">إجمالي مشاهدات الصفحات</span>
                <p className="font-display text-2xl sm:text-3xl font-bold text-slate-950 tabular-nums">
                  {summary.visitors.totalPageViews}
                </p>
                <span className="text-xs text-slate-500">مشاهدة مسجلة في قاعدة البيانات</span>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2">
                <span className="text-xs text-slate-500">توزيع الزوار الفريدين</span>
                <div className="space-y-1 text-xs sm:text-sm tabular-nums">
                  <div className="flex justify-between">
                    <span className="text-slate-600">اليوم:</span>
                    <span className="font-bold text-slate-950">{summary.visitors.visitorsToday}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">هذا الأسبوع:</span>
                    <span className="font-bold text-slate-950">{summary.visitors.visitorsThisWeek}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">هذا الشهر:</span>
                    <span className="font-bold text-slate-950">{summary.visitors.visitorsThisMonth}</span>
                  </div>
                </div>
              </div>
            </div>

            <CandlestickChart
              title="مؤشر أداء زوار الموقع (رسم الشموع اليومي)"
              subtitle="يعرض حركة مشاهدات الزوار الفعلية يومياً مقارنة باليوم السابق مع ذروة التفاعل اليومية"
              data={summary.visitors.candlestick}
              unitLabel="مشاهدة"
            />
          </section>

          {/* SECTION B: AMAZON AFFILIATE LINK CLICKS */}
          <section aria-labelledby="clicks-analytics-heading" className="space-y-5 pt-4 border-t border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <MousePointerClick className="w-5 h-5 text-amber-800" aria-hidden="true" />
                <h2
                  id="clicks-analytics-heading"
                  className="font-display text-xl font-bold text-slate-950"
                >
                  ب. نقرات روابط الشراء على أمازون مصر
                </h2>
              </div>
              <TrendBadge
                direction={summary.clicks.trendDirection}
                percent={summary.clicks.changePercent}
                compareLabel={`مقارنة بالفترة السابقة (${summary.clicks.previousRangeClicks} نقرة)`}
              />
            </div>

            {/* Important Affiliate Disclaimer */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-sm text-amber-950">
              <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
              <p className="leading-relaxed">
                <strong>تنبيه مهم:</strong> نقرات روابط أمازون تقيس عدد التحويلات الصادرة إلى صفحات
                المنتجات على أمازون مصر فقط، ولا تمثل عمليات شراء مؤكدة أو عمولات فعلية.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-1.5">
                <span className="text-xs text-slate-500">إجمالي نقرات أمازون</span>
                <p className="font-display text-2xl sm:text-3xl font-bold text-slate-950 tabular-nums">
                  {summary.clicks.totalClicks}
                </p>
                <span className="text-xs text-slate-500 tabular-nums">
                  نقرات النطاق المحدد: {summary.clicks.clicksInRange}
                </span>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-1.5">
                <span className="text-xs text-slate-500">معدل النقر (CTR) الفعلي</span>
                <p className="font-display text-2xl sm:text-3xl font-bold text-slate-950 tabular-nums">
                  {summary.clicks.ctrPercent}%
                </p>
                <span className="text-xs text-slate-500">محسوب من النقرات ÷ المشاهدات الفعلية</span>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-1.5">
                <span className="text-xs text-slate-500">اتجاه أداء النقرات</span>
                <div className="pt-1">
                  <TrendBadge
                    direction={summary.clicks.trendDirection}
                    percent={summary.clicks.changePercent}
                    compareLabel="مقارنة بالفترة السابقة"
                  />
                </div>
                <span className="text-xs text-slate-500 block">بناءً على النطاق الزمني المحدد</span>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2">
                <span className="text-xs text-slate-500">تفصيل النقرات</span>
                <div className="space-y-1 text-xs sm:text-sm tabular-nums">
                  <div className="flex justify-between">
                    <span className="text-slate-600">اليوم:</span>
                    <span className="font-bold text-slate-950">{summary.clicks.clicksToday}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">هذا الأسبوع:</span>
                    <span className="font-bold text-slate-950">{summary.clicks.clicksThisWeek}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">هذا الشهر:</span>
                    <span className="font-bold text-slate-950">{summary.clicks.clicksThisMonth}</span>
                  </div>
                </div>
              </div>
            </div>

            <CandlestickChart
              title="مؤشر نقرات روابط أمازون مصر (رسم الشموع اليومي)"
              subtitle="يوضح تطور النقرات الخارجة الفعلية نحو صفحات المنتجات على أمازون يومياً"
              data={summary.clicks.candlestick}
              unitLabel="نقرة"
            />

            {/* Most-Clicked Products & Per-Product Breakdown */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-display text-base sm:text-lg font-bold text-slate-950">
                  النقرات لكل منتج (الأكثر نقراً أولاً)
                </h3>
                <span className="text-xs text-slate-500 tabular-nums">
                  {summary.clicks.perProduct.length} منتج
                </span>
              </div>

              {summary.clicks.perProduct.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  لا توجد منتجات مسجلة بعد.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-sm">
                    <thead className="bg-slate-50 text-xs text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-5 font-semibold">المنتج</th>
                        <th className="py-3 px-4 font-semibold">الماركة</th>
                        <th className="py-3 px-4 font-semibold">ASIN</th>
                        <th className="py-3 px-4 font-semibold">نقرات النطاق المحدد</th>
                        <th className="py-3 px-5 font-semibold">إجمالي النقرات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {summary.clicks.perProduct.map((row) => (
                        <tr key={row.productId} className="hover:bg-slate-50/70">
                          <td className="py-3 px-5 font-medium text-slate-900 max-w-xs truncate">
                            {row.productName}
                          </td>
                          <td dir="ltr" className="py-3 px-4 font-latin text-xs text-slate-600">
                            {row.brand}
                          </td>
                          <td dir="ltr" className="py-3 px-4 font-latin text-xs text-slate-500 tabular-nums">
                            {row.asin}
                          </td>
                          <td className="py-3 px-4 tabular-nums font-semibold text-slate-700">
                            {row.clicksInRange}
                          </td>
                          <td className="py-3 px-5 tabular-nums font-bold text-amber-800">
                            {row.clicks}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
