import { useCallback, useEffect, useState } from 'react';
import {
  BarChart3,
  ExternalLink,
  FileText,
  FolderKanban,
  LayoutTemplate,
  LogOut,
  Package,
  Settings,
} from 'lucide-react';
import { INITIAL_SITE_SETTINGS } from '../data/catalog';
import { Article, MainCategory, Product, SiteSettings } from '../types/catalog';
import { ownerFetch, setStoredOwnerToken } from '../utils/ownerApi';
import { AnalyticsTab } from './owner/AnalyticsTab';
import { ArticlesTab } from './owner/ArticlesTab';
import { CategoriesTab } from './owner/CategoriesTab';
import { ContentTab } from './owner/ContentTab';
import { ProductsTab } from './owner/ProductsTab';
import { SettingsTab } from './owner/SettingsTab';

type OwnerTabId =
  | 'analytics'
  | 'categories'
  | 'products'
  | 'content'
  | 'articles'
  | 'settings';

interface OwnerDashboardProps {
  ownerUsername: string;
  onCatalogChanged: () => Promise<void>;
  onLoggedOut: () => void;
  onNavigateHome: () => void;
}

const TABS: Array<{ id: OwnerTabId; label: string; icon: typeof BarChart3 }> = [
  { id: 'analytics', label: 'الرئيسية والإحصائيات', icon: BarChart3 },
  { id: 'categories', label: 'إدارة الأقسام', icon: FolderKanban },
  { id: 'products', label: 'إدارة المنتجات', icon: Package },
  { id: 'content', label: 'إدارة المحتوى', icon: LayoutTemplate },
  { id: 'articles', label: 'إدارة المقالات', icon: FileText },
  { id: 'settings', label: 'إعدادات الموقع', icon: Settings },
];

export function OwnerDashboard({
  ownerUsername,
  onCatalogChanged,
  onLoggedOut,
  onNavigateHome,
}: OwnerDashboardProps) {
  const [activeTab, setActiveTab] = useState<OwnerTabId>('analytics');
  const [categories, setCategories] = useState<MainCategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [settings, setSettings] = useState<SiteSettings>(INITIAL_SITE_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState<{ text: string; isError: boolean } | null>(null);

  const notify = useCallback((text: string, isError = false) => {
    setNotice({ text, isError });
    window.setTimeout(() => {
      setNotice((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  }, []);

  const fetchWorkspace = useCallback(
    async (notifyPublic = false) => {
      try {
        const res = await ownerFetch('/api/owner/workspace');
        if (res.status === 401) {
          setStoredOwnerToken(null);
          onLoggedOut();
          return;
        }
        const data = await res.json().catch(() => ({}));
        if (res.ok && data?.ok) {
          setCategories(data.categories ?? []);
          setProducts(data.products ?? []);
          setArticles(data.articles ?? []);
          if (data.settings) setSettings(data.settings);
          if (notifyPublic) {
            await onCatalogChanged();
          }
        }
      } catch {
        notify('تعذر تحميل بيانات لوحة التحكم.', true);
      } finally {
        setIsLoading(false);
      }
    },
    [notify, onCatalogChanged, onLoggedOut]
  );

  useEffect(() => {
    fetchWorkspace(false);
  }, [fetchWorkspace]);

  const handleRefreshAfterMutation = useCallback(async () => {
    await fetchWorkspace(true);
  }, [fetchWorkspace]);

  const handleLogout = async () => {
    try {
      await ownerFetch('/api/owner/logout', { method: 'POST' });
    } catch {
      // Ignore network issues on logout
    }
    setStoredOwnerToken(null);
    onLoggedOut();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 text-right">
      {/* Top Owner Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-amber-800">
            لوحة تحكم المالك · حساب{' '}
            <span dir="ltr" className="font-latin">
              {ownerUsername}
            </span>
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-950 mt-0.5">
            إدارة موقع {settings.brandArabic} ({settings.brandEnglish})
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onNavigateHome}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <ExternalLink className="w-4 h-4" aria-hidden="true" />
            <span>معاينة الموقع العام</span>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </div>

      {/* Top Navigation Tabs */}
      <nav
        aria-label="أقسام لوحة تحكم المالك"
        className="bg-white border border-slate-200 rounded-2xl p-2 flex items-center gap-1.5 overflow-x-auto"
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              aria-current={active ? 'page' : undefined}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap shrink-0 transition-colors ${
                active
                  ? 'bg-amber-700 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Non-blocking status notification */}
      {notice && (
        <div
          role="status"
          aria-live="polite"
          className={`rounded-xl px-4 py-3 text-sm font-semibold border ${
            notice.isError
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}
        >
          {notice.text}
        </div>
      )}

      {/* Active Tab Content */}
      {isLoading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-sm text-slate-500">
          جاري تحميل بيانات لوحة التحكم...
        </div>
      ) : (
        <div>
          {activeTab === 'analytics' && <AnalyticsTab />}
          {activeTab === 'categories' && (
            <CategoriesTab
              categories={categories}
              products={products}
              onRefreshWorkspace={handleRefreshAfterMutation}
              onNotify={notify}
            />
          )}
          {activeTab === 'products' && (
            <ProductsTab
              categories={categories}
              products={products}
              onRefreshWorkspace={handleRefreshAfterMutation}
              onNotify={notify}
            />
          )}
          {activeTab === 'content' && (
            <ContentTab
              settings={settings}
              products={products}
              onRefreshWorkspace={handleRefreshAfterMutation}
              onNotify={notify}
            />
          )}
          {activeTab === 'articles' && (
            <ArticlesTab
              articles={articles}
              categories={categories}
              onRefreshWorkspace={handleRefreshAfterMutation}
              onNotify={notify}
            />
          )}
          {activeTab === 'settings' && (
            <SettingsTab
              settings={settings}
              ownerUsername={ownerUsername}
              onRefreshWorkspace={handleRefreshAfterMutation}
              onNotify={notify}
            />
          )}
        </div>
      )}
    </div>
  );
}
