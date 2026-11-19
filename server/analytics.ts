import { AnalyticsSummary, CandlestickPoint } from '../src/types/catalog';
import { db, getCairoDateKey, getCairoHour } from './db';

function addDays(dateKey: string, delta: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + delta));
  return dt.toISOString().slice(0, 10);
}

function enumerateDateKeys(startDate: string, endDate: string): string[] {
  const result: string[] = [];
  let cursor = startDate;
  let guard = 0;
  while (cursor <= endDate && guard < 120) {
    result.push(cursor);
    cursor = addDays(cursor, 1);
    guard += 1;
  }
  return result;
}

function computeTrend(current: number, previous: number): {
  changePercent: number;
  trendDirection: 'up' | 'down' | 'flat';
} {
  if (previous === 0 && current === 0) {
    return { changePercent: 0, trendDirection: 'flat' };
  }
  if (previous === 0 && current > 0) {
    return { changePercent: 100, trendDirection: 'up' };
  }
  const diff = ((current - previous) / previous) * 100;
  const rounded = Math.round(diff * 10) / 10;
  if (rounded > 0) return { changePercent: rounded, trendDirection: 'up' };
  if (rounded < 0) return { changePercent: rounded, trendDirection: 'down' };
  return { changePercent: 0, trendDirection: 'flat' };
}

function formatArabicShortDate(dateKey: string): string {
  const [, month, day] = dateKey.split('-');
  return `${day}/${month}`;
}

export function recordVisit(params: {
  visitorId: string;
  sessionId: string;
  pagePath: string;
  pageType: string;
  entityId?: string;
  referrer?: string;
}): void {
  const now = new Date();
  const dateKey = getCairoDateKey(now);
  db.prepare(
    `INSERT INTO visitor_events (visitor_id, session_id, page_path, page_type, entity_id, referrer, created_at, date_key)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    params.visitorId,
    params.sessionId,
    params.pagePath,
    params.pageType,
    params.entityId ?? '',
    params.referrer ?? '',
    now.toISOString(),
    dateKey
  );
}

export function recordAffiliateClick(params: {
  clickId: string;
  visitorId: string;
  productId: string;
  productName: string;
  brand: string;
  model: string;
  asin: string;
  affiliateUrl: string;
  categoryId: string;
  subcategoryId: string;
  priceEgp: number;
}): { recordedAt: string } {
  const now = new Date();
  const recordedAt = now.toISOString();
  const dateKey = getCairoDateKey(now);

  db.prepare(
    `INSERT INTO affiliate_clicks (
      click_id, visitor_id, product_id, product_name, brand, model, asin,
      affiliate_url, category_id, subcategory_id, price_egp, created_at, date_key
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    params.clickId,
    params.visitorId,
    params.productId,
    params.productName,
    params.brand,
    params.model,
    params.asin,
    params.affiliateUrl,
    params.categoryId,
    params.subcategoryId,
    params.priceEgp,
    recordedAt,
    dateKey
  );

  return { recordedAt };
}

function buildCandlestickSeries(
  dateKeys: string[],
  dailyTotals: Map<string, number>,
  hourlyPeaks: Map<string, number>,
  seedBeforeStart: number
): CandlestickPoint[] {
  let prevClose = seedBeforeStart;
  return dateKeys.map((dateKey) => {
    const total = dailyTotals.get(dateKey) ?? 0;
    const open = prevClose;
    const close = total;
    const peak = hourlyPeaks.get(dateKey) ?? 0;
    const high = Math.max(open, close, peak);
    const low = Math.min(open, close);
    prevClose = close;
    return {
      dateKey,
      label: formatArabicShortDate(dateKey),
      open,
      high,
      low,
      close,
      total,
    };
  });
}

export function getAnalyticsSummary(startDateInput?: string, endDateInput?: string): AnalyticsSummary {
  const todayKey = getCairoDateKey(new Date());
  const endDate = endDateInput && /^\d{4}-\d{2}-\d{2}$/.test(endDateInput) ? endDateInput : todayKey;
  const startDate =
    startDateInput && /^\d{4}-\d{2}-\d{2}$/.test(startDateInput)
      ? startDateInput
      : addDays(endDate, -13);

  const safeStart = startDate <= endDate ? startDate : endDate;
  const dateKeys = enumerateDateKeys(safeStart, endDate);
  const rangeDays = Math.max(1, dateKeys.length);

  const prevEnd = addDays(safeStart, -1);
  const prevStart = addDays(prevEnd, -(rangeDays - 1));

  const weekStart = addDays(todayKey, -6);
  const monthStart = `${todayKey.slice(0, 7)}-01`;

  // === VISITORS QUERIES ===
  const totalSessionsRow = db
    .prepare('SELECT COUNT(DISTINCT session_id) as cnt FROM visitor_events')
    .get();
  const uniqueVisitorsRow = db
    .prepare('SELECT COUNT(DISTINCT visitor_id) as cnt FROM visitor_events')
    .get();
  const totalViewsRow = db.prepare('SELECT COUNT(*) as cnt FROM visitor_events').get();

  const todayVisitorsRow = db
    .prepare('SELECT COUNT(DISTINCT visitor_id) as cnt FROM visitor_events WHERE date_key = ?')
    .get(todayKey);
  const weekVisitorsRow = db
    .prepare(
      'SELECT COUNT(DISTINCT visitor_id) as cnt FROM visitor_events WHERE date_key BETWEEN ? AND ?'
    )
    .get(weekStart, todayKey);
  const monthVisitorsRow = db
    .prepare(
      'SELECT COUNT(DISTINCT visitor_id) as cnt FROM visitor_events WHERE date_key BETWEEN ? AND ?'
    )
    .get(monthStart, todayKey);

  const rangeVisitorsRow = db
    .prepare(
      'SELECT COUNT(DISTINCT visitor_id) as cnt FROM visitor_events WHERE date_key BETWEEN ? AND ?'
    )
    .get(safeStart, endDate);
  const rangePageViewsRow = db
    .prepare('SELECT COUNT(*) as cnt FROM visitor_events WHERE date_key BETWEEN ? AND ?')
    .get(safeStart, endDate);
  const prevRangeVisitorsRow = db
    .prepare(
      'SELECT COUNT(DISTINCT visitor_id) as cnt FROM visitor_events WHERE date_key BETWEEN ? AND ?'
    )
    .get(prevStart, prevEnd);

  const dayBeforeStart = addDays(safeStart, -1);
  const seedVisitRow = db
    .prepare('SELECT COUNT(*) as cnt FROM visitor_events WHERE date_key = ?')
    .get(dayBeforeStart);

  const visitRowsInRange = db
    .prepare('SELECT date_key, created_at FROM visitor_events WHERE date_key BETWEEN ? AND ?')
    .all(safeStart, endDate);

  const dailyVisitTotals = new Map<string, number>();
  const hourlyVisitBuckets = new Map<string, Map<number, number>>();
  for (const row of visitRowsInRange) {
    const dk = String(row.date_key);
    dailyVisitTotals.set(dk, (dailyVisitTotals.get(dk) ?? 0) + 1);
    const hr = getCairoHour(new Date(String(row.created_at)));
    const dayMap = hourlyVisitBuckets.get(dk) ?? new Map<number, number>();
    dayMap.set(hr, (dayMap.get(hr) ?? 0) + 1);
    hourlyVisitBuckets.set(dk, dayMap);
  }

  const hourlyVisitPeaks = new Map<string, number>();
  for (const [dk, dayMap] of hourlyVisitBuckets.entries()) {
    let maxVal = 0;
    for (const val of dayMap.values()) {
      if (val > maxVal) maxVal = val;
    }
    hourlyVisitPeaks.set(dk, maxVal);
  }

  const visitorsInRange = Number(rangeVisitorsRow?.cnt ?? 0);
  const previousRangeVisitors = Number(prevRangeVisitorsRow?.cnt ?? 0);
  const visitorTrend = computeTrend(visitorsInRange, previousRangeVisitors);

  // === AFFILIATE CLICKS QUERIES ===
  const totalClicksRow = db.prepare('SELECT COUNT(*) as cnt FROM affiliate_clicks').get();
  const todayClicksRow = db
    .prepare('SELECT COUNT(*) as cnt FROM affiliate_clicks WHERE date_key = ?')
    .get(todayKey);
  const weekClicksRow = db
    .prepare('SELECT COUNT(*) as cnt FROM affiliate_clicks WHERE date_key BETWEEN ? AND ?')
    .get(weekStart, todayKey);
  const monthClicksRow = db
    .prepare('SELECT COUNT(*) as cnt FROM affiliate_clicks WHERE date_key BETWEEN ? AND ?')
    .get(monthStart, todayKey);
  const rangeClicksRow = db
    .prepare('SELECT COUNT(*) as cnt FROM affiliate_clicks WHERE date_key BETWEEN ? AND ?')
    .get(safeStart, endDate);
  const prevRangeClicksRow = db
    .prepare('SELECT COUNT(*) as cnt FROM affiliate_clicks WHERE date_key BETWEEN ? AND ?')
    .get(prevStart, prevEnd);
  const seedClickRow = db
    .prepare('SELECT COUNT(*) as cnt FROM affiliate_clicks WHERE date_key = ?')
    .get(dayBeforeStart);

  const clickRowsInRange = db
    .prepare('SELECT date_key, created_at FROM affiliate_clicks WHERE date_key BETWEEN ? AND ?')
    .all(safeStart, endDate);

  const dailyClickTotals = new Map<string, number>();
  const hourlyClickBuckets = new Map<string, Map<number, number>>();
  for (const row of clickRowsInRange) {
    const dk = String(row.date_key);
    dailyClickTotals.set(dk, (dailyClickTotals.get(dk) ?? 0) + 1);
    const hr = getCairoHour(new Date(String(row.created_at)));
    const dayMap = hourlyClickBuckets.get(dk) ?? new Map<number, number>();
    dayMap.set(hr, (dayMap.get(hr) ?? 0) + 1);
    hourlyClickBuckets.set(dk, dayMap);
  }

  const hourlyClickPeaks = new Map<string, number>();
  for (const [dk, dayMap] of hourlyClickBuckets.entries()) {
    let maxVal = 0;
    for (const val of dayMap.values()) {
      if (val > maxVal) maxVal = val;
    }
    hourlyClickPeaks.set(dk, maxVal);
  }

  const clicksInRange = Number(rangeClicksRow?.cnt ?? 0);
  const previousRangeClicks = Number(prevRangeClicksRow?.cnt ?? 0);
  const clickTrend = computeTrend(clicksInRange, previousRangeClicks);

  const pageViewsInRange = Number(rangePageViewsRow?.cnt ?? 0);
  const ctrPercent =
    pageViewsInRange > 0
      ? Math.round((clicksInRange / pageViewsInRange) * 10000) / 100
      : 0;

  // Per-product click counts (real database aggregation joined with products)
  const productRows = db.prepare('SELECT id, name, brand, asin FROM products').all();
  const totalClicksByProdRows = db
    .prepare('SELECT product_id, COUNT(*) as cnt FROM affiliate_clicks GROUP BY product_id')
    .all();
  const rangeClicksByProdRows = db
    .prepare(
      'SELECT product_id, COUNT(*) as cnt FROM affiliate_clicks WHERE date_key BETWEEN ? AND ? GROUP BY product_id'
    )
    .all(safeStart, endDate);

  const totalByProd = new Map<string, number>();
  for (const r of totalClicksByProdRows) {
    totalByProd.set(String(r.product_id), Number(r.cnt));
  }
  const rangeByProd = new Map<string, number>();
  for (const r of rangeClicksByProdRows) {
    rangeByProd.set(String(r.product_id), Number(r.cnt));
  }

  const perProduct = productRows
    .map((p) => {
      const id = String(p.id);
      return {
        productId: id,
        productName: String(p.name),
        brand: String(p.brand),
        asin: String(p.asin),
        clicks: totalByProd.get(id) ?? 0,
        clicksInRange: rangeByProd.get(id) ?? 0,
      };
    })
    .sort((a, b) => b.clicks - a.clicks || b.clicksInRange - a.clicksInRange);

  return {
    range: {
      startDate: safeStart,
      endDate,
      days: rangeDays,
    },
    visitors: {
      totalVisits: Number(totalSessionsRow?.cnt ?? 0),
      uniqueVisitors: Number(uniqueVisitorsRow?.cnt ?? 0),
      totalPageViews: Number(totalViewsRow?.cnt ?? 0),
      visitorsToday: Number(todayVisitorsRow?.cnt ?? 0),
      visitorsThisWeek: Number(weekVisitorsRow?.cnt ?? 0),
      visitorsThisMonth: Number(monthVisitorsRow?.cnt ?? 0),
      visitorsInRange,
      previousRangeVisitors,
      changePercent: visitorTrend.changePercent,
      trendDirection: visitorTrend.trendDirection,
      candlestick: buildCandlestickSeries(
        dateKeys,
        dailyVisitTotals,
        hourlyVisitPeaks,
        Number(seedVisitRow?.cnt ?? 0)
      ),
    },
    clicks: {
      totalClicks: Number(totalClicksRow?.cnt ?? 0),
      clicksToday: Number(todayClicksRow?.cnt ?? 0),
      clicksThisWeek: Number(weekClicksRow?.cnt ?? 0),
      clicksThisMonth: Number(monthClicksRow?.cnt ?? 0),
      clicksInRange,
      previousRangeClicks,
      changePercent: clickTrend.changePercent,
      trendDirection: clickTrend.trendDirection,
      ctrPercent,
      candlestick: buildCandlestickSeries(
        dateKeys,
        dailyClickTotals,
        hourlyClickPeaks,
        Number(seedClickRow?.cnt ?? 0)
      ),
      perProduct,
    },
  };
}
