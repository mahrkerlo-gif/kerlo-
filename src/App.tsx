import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, ExternalLink, X } from 'lucide-react';
import { ArticlePage } from './components/ArticlePage';
import { CategoryPage } from './components/CategoryPage';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { HomePage } from './components/HomePage';
import { OwnerDashboard } from './components/OwnerDashboard';
import { OwnerLoginPage } from './components/OwnerLoginPage';
import { ProductDetailPage } from './components/ProductDetailPage';
import { ProductListingPage } from './components/ProductListingPage';
import { SearchOverlay } from './components/SearchOverlay';
import {
  INITIAL_ARTICLES,
  INITIAL_SITE_SETTINGS,
  MAIN_CATEGORIES,
  PRODUCTS,
} from './data/catalog';
import {
  Article,
  MainCategory,
  OutboundClickConfirmation,
  Product,
  RouteState,
  SiteSettings,
} from './types/catalog';
import { getVisitorIdentifiers, ownerFetch, setStoredOwnerToken } from './utils/ownerApi';

function parseHashToRoute(
  categories: MainCategory[],
  products: Product[],
  articles: Article[]
): RouteState {
  const hash = window.location.hash.replace(/^#/, '');
  if (!hash || hash === '/') {
    return { view: 'home' };
  }

  const parts = hash.split('/').filter(Boolean);
  if (parts[0] === 'owner-login') {
    return { view: 'owner-login' };
  }
  if (parts[0] === 'owner' || parts[0] === 'admin') {
    return { view: 'owner-dashboard' };
  }
  if (parts[0] === 'article' && parts[1]) {
    if (articles.some((a) => a.id === parts[1])) {
      return { view: 'article', articleId: parts[1] };
    }
  }
  if (parts[0] === 'category' && parts[1] && parts[2]) {
    const cat = categories.find((c) => c.id === parts[1]);
    if (cat?.subcategories.some((s) => s.id === parts[2])) {
      return { view: 'subcategory', categoryId: parts[1], subcategoryId: parts[2] };
    }
  }
  if (parts[0] === 'category' && parts[1]) {
    if (categories.some((c) => c.id === parts[1])) {
      return { view: 'category', categoryId: parts[1] };
    }
  }
  if (parts[0] === 'product' && parts[1]) {
    if (products.some((p) => p.id === parts[1])) {
      return { view: 'product', productId: parts[1] };
    }
  }

  return { view: 'home' };
}

function routeToHash(route: RouteState): string {
  switch (route.view) {
    case 'home':
      return '#/';
    case 'owner-login':
      return '#/owner-login';
    case 'owner-dashboard':
      return '#/owner';
    case 'article':
      return `#/article/${route.articleId}`;
    case 'category':
      return `#/category/${route.categoryId}`;
    case 'subcategory':
      return `#/category/${route.categoryId}/${route.subcategoryId}`;
    case 'product':
      return `#/product/${route.productId}`;
  }
}

export default function App() {
  const [categories, setCategories] = useState<MainCategory[]>(MAIN_CATEGORIES);
  const [products, setProducts] = useState<Product[]>(PRODUCTS);
  const [articles, setArticles] = useState<Article[]>(INITIAL_ARTICLES);
  const [settings, setSettings] = useState<SiteSettings>(INITIAL_SITE_SETTINGS);

  const [isOwnerAuthenticated, setIsOwnerAuthenticated] = useState(false);
  const [ownerUsername, setOwnerUsername] = useState('');
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  const [route, setRoute] = useState<RouteState>(() =>
    parseHashToRoute(MAIN_CATEGORIES, PRODUCTS, INITIAL_ARTICLES)
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(() => {
    const initial = parseHashToRoute(MAIN_CATEGORIES, PRODUCTS, INITIAL_ARTICLES);
    return initial.view === 'category' || initial.view === 'subcategory'
      ? initial.categoryId
      : null;
  });
  const [pendingCategoryId, setPendingCategoryId] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [clickCounts, setClickCounts] = useState<Record<string, number>>({});
  const [lastClickNotice, setLastClickNotice] = useState<OutboundClickConfirmation | null>(null);

  const reloadPublicBootstrap = useCallback(async () => {
    try {
      const res = await fetch('/api/public/bootstrap');
      if (!res.ok) return;
      const data = await res.json();
      if (data?.ok) {
        if (Array.isArray(data.categories)) setCategories(data.categories);
        if (Array.isArray(data.products)) setProducts(data.products);
        if (Array.isArray(data.articles)) setArticles(data.articles);
        if (data.settings) setSettings(data.settings);
      }
    } catch {
      // Fallback to initial seed data if offline
    }
  }, []);

  useEffect(() => {
    reloadPublicBootstrap();
  }, [reloadPublicBootstrap]);

  // Verify existing owner session cookie / token on load
  useEffect(() => {
    let active = true;
    ownerFetch('/api/owner/session')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active) return;
        if (data?.ok && data.authenticated) {
          setIsOwnerAuthenticated(true);
          setOwnerUsername(data.username || 'Kirlos Maher');
        } else {
          setIsOwnerAuthenticated(false);
          setStoredOwnerToken(null);
        }
      })
      .catch(() => {
        if (active) setIsOwnerAuthenticated(false);
      })
      .finally(() => {
        if (active) setIsCheckingSession(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Re-sync route whenever hash or bootstrap data changes
  useEffect(() => {
    const handleHashChange = () => {
      const nextRoute = parseHashToRoute(categories, products, articles);
      setRoute(nextRoute);
      if (nextRoute.view === 'category' || nextRoute.view === 'subcategory') {
        setSelectedCategoryId(nextRoute.categoryId);
      }
      window.scrollTo({ top: 0, behavior: 'auto' });
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [categories, products, articles]);

  // Record real visitor page views on public routes (never on owner routes)
  useEffect(() => {
    if (route.view === 'owner-login' || route.view === 'owner-dashboard') {
      return;
    }

    const { visitorId, sessionId } = getVisitorIdentifiers();
    const pagePath = routeToHash(route);
    let entityId = '';
    if (route.view === 'category') entityId = route.categoryId;
    else if (route.view === 'subcategory') entityId = route.subcategoryId;
    else if (route.view === 'product') entityId = route.productId;
    else if (route.view === 'article') entityId = route.articleId;

    fetch('/api/analytics/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        visitorId,
        sessionId,
        pagePath,
        pageType: route.view,
        entityId,
        referrer: document.referrer || '',
      }),
    }).catch(() => {
      // Non-blocking analytics call
    });
  }, [route]);

  const navigateTo = useCallback((nextRoute: RouteState) => {
    const targetHash = routeToHash(nextRoute);
    if (window.location.hash !== targetHash) {
      window.location.hash = targetHash;
    } else {
      setRoute(nextRoute);
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, []);

  const handleNavigateOwner = useCallback(() => {
    if (isOwnerAuthenticated) {
      navigateTo({ view: 'owner-dashboard' });
    } else {
      navigateTo({ view: 'owner-login' });
    }
  }, [isOwnerAuthenticated, navigateTo]);

  const handleSelectMainCategory = useCallback(
    (categoryId: string) => {
      setSelectedCategoryId(categoryId);
      setPendingCategoryId(categoryId);

      window.setTimeout(() => {
        setPendingCategoryId(null);
        navigateTo({ view: 'category', categoryId });
      }, 160);
    },
    [navigateTo]
  );

  const handleNavigateCategoryImmediate = useCallback(
    (categoryId: string) => {
      setSelectedCategoryId(categoryId);
      setPendingCategoryId(null);
      navigateTo({ view: 'category', categoryId });
    },
    [navigateTo]
  );

  const handleSelectSubcategory = useCallback(
    (categoryId: string, subcategoryId: string) => {
      setSelectedCategoryId(categoryId);
      navigateTo({ view: 'subcategory', categoryId, subcategoryId });
    },
    [navigateTo]
  );

  const handleSelectProduct = useCallback(
    (productId: string) => {
      const prod = products.find((p) => p.id === productId);
      if (prod) {
        setSelectedCategoryId(prod.categoryId);
      }
      navigateTo({ view: 'product', productId });
    },
    [products, navigateTo]
  );

  const handleSelectArticle = useCallback(
    (articleId: string) => {
      navigateTo({ view: 'article', articleId });
    },
    [navigateTo]
  );

  const handlePurchaseClick = useCallback(async (product: Product) => {
    setClickCounts((prev) => ({
      ...prev,
      [product.id]: (prev[product.id] ?? 0) + 1,
    }));

    const { visitorId } = getVisitorIdentifiers();
    const payload = {
      visitorId,
      productId: product.id,
      productName: product.name,
      brand: product.brand,
      model: product.model,
      asin: product.asin,
      affiliateUrl: product.affiliateUrl,
      categoryId: product.categoryId,
      subcategoryId: product.subcategoryId,
      priceEgp: product.verifiedPriceEgp,
    };

    try {
      const response = await fetch('/api/affiliate-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      });

      if (response.ok) {
        const result = await response.json();
        setLastClickNotice({
          clickId: result.clickId,
          productId: product.id,
          productName: product.name,
          asin: product.asin,
          affiliateUrl: result.redirectUrl ?? product.affiliateUrl,
          recordedAt: result.recordedAt,
        });
        return;
      }
    } catch {
      // Fallback confirmation notice if offline
    }

    setLastClickNotice({
      clickId: `local_${Date.now()}`,
      productId: product.id,
      productName: product.name,
      asin: product.asin,
      affiliateUrl: product.affiliateUrl,
      recordedAt: new Date().toISOString(),
    });
  }, []);

  const renderMainContent = () => {
    if (route.view === 'owner-login') {
      if (isOwnerAuthenticated) {
        return (
          <OwnerDashboard
            ownerUsername={ownerUsername || 'Kirlos Maher'}
            onCatalogChanged={reloadPublicBootstrap}
            onLoggedOut={() => {
              setIsOwnerAuthenticated(false);
              setOwnerUsername('');
              navigateTo({ view: 'owner-login' });
            }}
            onNavigateHome={() => navigateTo({ view: 'home' })}
          />
        );
      }

      return (
        <OwnerLoginPage
          onLoginSuccess={(username) => {
            setIsOwnerAuthenticated(true);
            setOwnerUsername(username);
            navigateTo({ view: 'owner-dashboard' });
          }}
          onNavigateHome={() => navigateTo({ view: 'home' })}
        />
      );
    }

    if (route.view === 'owner-dashboard') {
      if (isCheckingSession) {
        return (
          <div className="max-w-md mx-auto py-20 text-center text-sm text-slate-500">
            جاري التحقق من جلسة المالك...
          </div>
        );
      }

      if (!isOwnerAuthenticated) {
        return (
          <OwnerLoginPage
            onLoginSuccess={(username) => {
              setIsOwnerAuthenticated(true);
              setOwnerUsername(username);
              navigateTo({ view: 'owner-dashboard' });
            }}
            onNavigateHome={() => navigateTo({ view: 'home' })}
          />
        );
      }

      return (
        <OwnerDashboard
          ownerUsername={ownerUsername || 'Kirlos Maher'}
          onCatalogChanged={reloadPublicBootstrap}
          onLoggedOut={() => {
            setIsOwnerAuthenticated(false);
            setOwnerUsername('');
            navigateTo({ view: 'owner-login' });
          }}
          onNavigateHome={() => navigateTo({ view: 'home' })}
        />
      );
    }

    if (route.view === 'article') {
      const article = articles.find((a) => a.id === route.articleId);
      if (article) {
        const category = categories.find((c) => c.id === article.categoryId);
        const relatedProducts = products.filter((p) => p.categoryId === article.categoryId);
        return (
          <ArticlePage
            article={article}
            category={category}
            relatedProducts={relatedProducts}
            onNavigateHome={() => navigateTo({ view: 'home' })}
            onNavigateCategory={handleNavigateCategoryImmediate}
            onSelectProduct={handleSelectProduct}
          />
        );
      }
    }

    if (route.view === 'category') {
      const category = categories.find((c) => c.id === route.categoryId);
      if (category) {
        return (
          <CategoryPage
            category={category}
            products={products}
            onNavigateHome={() => navigateTo({ view: 'home' })}
            onSelectSubcategory={handleSelectSubcategory}
          />
        );
      }
    }

    if (route.view === 'subcategory') {
      const category = categories.find((c) => c.id === route.categoryId);
      const subcategory = category?.subcategories.find(
        (s) => s.id === route.subcategoryId
      );
      if (category && subcategory) {
        const subProducts = products.filter(
          (p) => p.categoryId === category.id && p.subcategoryId === subcategory.id
        );
        return (
          <ProductListingPage
            category={category}
            subcategory={subcategory}
            products={subProducts}
            clickCounts={clickCounts}
            onNavigateHome={() => navigateTo({ view: 'home' })}
            onNavigateCategory={handleNavigateCategoryImmediate}
            onSelectProduct={handleSelectProduct}
            onPurchaseClick={handlePurchaseClick}
          />
        );
      }
    }

    if (route.view === 'product') {
      const product = products.find((p) => p.id === route.productId);
      if (product) {
        const category = categories.find((c) => c.id === product.categoryId);
        const subcategory = category?.subcategories.find(
          (s) => s.id === product.subcategoryId
        );
        if (category && subcategory) {
          const relatedProducts = products.filter(
            (item) =>
              item.categoryId === category.id &&
              item.subcategoryId === subcategory.id &&
              item.id !== product.id
          );

          return (
            <ProductDetailPage
              category={category}
              subcategory={subcategory}
              product={product}
              relatedProducts={relatedProducts}
              clickCount={clickCounts[product.id] ?? 0}
              onNavigateHome={() => navigateTo({ view: 'home' })}
              onNavigateCategory={handleNavigateCategoryImmediate}
              onNavigateSubcategory={handleSelectSubcategory}
              onSelectProduct={handleSelectProduct}
              onPurchaseClick={handlePurchaseClick}
            />
          );
        }
      }
    }

    return (
      <HomePage
        categories={categories}
        products={products}
        articles={articles}
        settings={settings}
        selectedCategoryId={selectedCategoryId}
        pendingCategoryId={pendingCategoryId}
        onSelectCategory={handleSelectMainCategory}
        onSelectProduct={handleSelectProduct}
        onSelectArticle={handleSelectArticle}
        onPurchaseClick={handlePurchaseClick}
      />
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Header
        route={route}
        settings={settings}
        isOwnerAuthenticated={isOwnerAuthenticated}
        onNavigateHome={() => navigateTo({ view: 'home' })}
        onNavigateCategory={handleNavigateCategoryImmediate}
        onNavigateOwner={handleNavigateOwner}
        onOpenSearch={() => setIsSearchOpen(true)}
      />

      {/* Non-blocking confirmation toast when an outbound Amazon Egypt click is recorded */}
      {lastClickNotice && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-4 left-4 right-4 sm:left-6 sm:right-auto sm:max-w-md z-40 bg-slate-900 text-white rounded-xl p-4 shadow-lg border border-slate-700"
        >
          <div className="flex items-start justify-between gap-3 text-right">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="space-y-1 text-xs sm:text-sm">
                <p className="font-semibold">
                  تم تسجيل نقرة الشراء وفتح صفحة المنتج على أمازون مصر
                </p>
                <p className="text-slate-300 line-clamp-1">{lastClickNotice.productName}</p>
                <a
                  href={lastClickNotice.affiliateUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-amber-300 hover:text-amber-200 underline underline-offset-4 font-latin text-xs"
                  dir="ltr"
                >
                  <span>amazon.eg/dp/{lastClickNotice.asin}</span>
                  <ExternalLink className="w-3 h-3" aria-hidden="true" />
                </a>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setLastClickNotice(null)}
              aria-label="إغلاق الإشعار"
              className="p-1 text-slate-400 hover:text-white rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <main className="flex-1">{renderMainContent()}</main>

      <Footer
        categories={categories}
        settings={settings}
        isOwnerAuthenticated={isOwnerAuthenticated}
        onNavigateHome={() => navigateTo({ view: 'home' })}
        onNavigateCategory={handleNavigateCategoryImmediate}
        onNavigateOwner={handleNavigateOwner}
      />

      <SearchOverlay
        isOpen={isSearchOpen}
        categories={categories}
        products={products}
        onClose={() => setIsSearchOpen(false)}
        onSelectCategory={handleNavigateCategoryImmediate}
        onSelectProduct={handleSelectProduct}
      />
    </div>
  );
}
