export enum AvailabilityStatus {
  IN_STOCK = 'IN_STOCK',
  LIMITED_STOCK = 'LIMITED_STOCK',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
}

export type UsageLevel = 'beginner' | 'intermediate' | 'pro';
export type PriorityPreference = 'quality' | 'price' | 'value' | 'daily';
export type ProductBadge = 'popular' | 'new' | 'discounted' | 'best_value' | 'featured';

export type BudgetBracketId =
  | 'under_500'
  | '500_1000'
  | '1000_2000'
  | '2000_3000'
  | '3000_5000'
  | '5000_10000'
  | 'over_10000';

export interface ProductSpec {
  label: string;
  value: string;
}

export interface Product {
  id: string;
  categoryId: string;
  subcategoryId: string;
  name: string;
  brand: string;
  model: string;
  asin: string;
  affiliateUrl: string;
  image: string;
  galleryImages?: string[];
  description: string;
  editorialNote: string;
  specs: ProductSpec[];
  advantages: string[];
  disadvantages: string[];
  verifiedPriceEgp: number;
  originalPriceEgp?: number;
  priceVerifiedDate: string;
  availability: AvailabilityStatus;
  availabilityText: string;
  usageLevels?: UsageLevel[];
  priorities?: PriorityPreference[];
  badges?: ProductBadge[];
  displayOrder?: number;
  isEnabled?: boolean;
}

export interface Subcategory {
  id: string;
  categoryId: string;
  title: string;
  description: string;
  image: string;
  buyingTip: string;
  displayOrder?: number;
  isEnabled?: boolean;
}

export interface MainCategory {
  id: string;
  title: string;
  englishTitle: string;
  description: string;
  image: string;
  displayOrder?: number;
  isEnabled?: boolean;
  subcategories: Subcategory[];
}

export interface Article {
  id: string;
  title: string;
  summary: string;
  content: string;
  coverImage: string;
  categoryId: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SiteSettings {
  brandArabic: string;
  brandEnglish: string;
  slogan: string;
  heroHeadline: string;
  heroSubheadline: string;
  finderTitle: string;
  finderDescription: string;
  showFeaturedSection: boolean;
  showArticlesSection: boolean;
  methodologyTitle: string;
  methodologySubtitle: string;
  footerAbout: string;
  affiliateDisclosure: string;
  amazonTag: string;
}

export interface OutboundClickConfirmation {
  clickId: string;
  productId: string;
  productName: string;
  asin: string;
  affiliateUrl: string;
  recordedAt: string;
}

export interface CandlestickPoint {
  dateKey: string;
  label: string;
  open: number;
  high: number;
  low: number;
  close: number;
  total: number;
}

export interface AnalyticsSummary {
  range: {
    startDate: string;
    endDate: string;
    days: number;
  };
  visitors: {
    totalVisits: number;
    uniqueVisitors: number;
    totalPageViews: number;
    visitorsToday: number;
    visitorsThisWeek: number;
    visitorsThisMonth: number;
    visitorsInRange: number;
    previousRangeVisitors: number;
    changePercent: number;
    trendDirection: 'up' | 'down' | 'flat';
    candlestick: CandlestickPoint[];
  };
  clicks: {
    totalClicks: number;
    clicksToday: number;
    clicksThisWeek: number;
    clicksThisMonth: number;
    clicksInRange: number;
    previousRangeClicks: number;
    changePercent: number;
    trendDirection: 'up' | 'down' | 'flat';
    ctrPercent: number;
    candlestick: CandlestickPoint[];
    perProduct: Array<{
      productId: string;
      productName: string;
      brand: string;
      asin: string;
      clicks: number;
      clicksInRange: number;
    }>;
  };
}

export type RouteState =
  | { view: 'home' }
  | { view: 'category'; categoryId: string }
  | { view: 'subcategory'; categoryId: string; subcategoryId: string }
  | { view: 'product'; productId: string }
  | { view: 'article'; articleId: string }
  | { view: 'owner-login' }
  | { view: 'owner-dashboard' };
