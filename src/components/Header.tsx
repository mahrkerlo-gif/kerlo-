import { Lock, Search } from 'lucide-react';
import { RouteState, SiteSettings } from '../types/catalog';

interface HeaderProps {
  route: RouteState;
  settings: SiteSettings;
  isOwnerAuthenticated: boolean;
  onNavigateHome: () => void;
  onNavigateCategory: (categoryId: string) => void;
  onNavigateOwner: () => void;
  onOpenSearch: () => void;
}

export function Header({
  route,
  settings,
  isOwnerAuthenticated,
  onNavigateHome,
  onNavigateCategory,
  onNavigateOwner,
  onOpenSearch,
}: HeaderProps) {
  const isContentActive =
    (route.view === 'category' || route.view === 'subcategory') &&
    route.categoryId === 'content-creation';

  const isComputerActive =
    (route.view === 'category' || route.view === 'subcategory') &&
    route.categoryId === 'computer-gear';

  const isOwnerActive =
    route.view === 'owner-login' || route.view === 'owner-dashboard';

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
        {/* Zone 1: Brand Wordmark */}
        <button
          type="button"
          onClick={onNavigateHome}
          className="flex items-baseline gap-2.5 whitespace-nowrap shrink-0 text-right focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-700 rounded"
        >
          <span className="font-display text-xl sm:text-2xl font-bold text-slate-950 tracking-tight">
            {settings.brandArabic}
          </span>
          <span
            dir="ltr"
            className="font-latin text-xs font-bold tracking-widest text-amber-800 uppercase"
          >
            {settings.brandEnglish}
          </span>
        </button>

        {/* Zone 2: Concise single-line navigation links */}
        <nav
          aria-label="التنقل الرئيسي"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600"
        >
          <button
            type="button"
            onClick={onNavigateHome}
            className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors duration-150 ${
              route.view === 'home'
                ? 'border-amber-700 text-slate-950 font-semibold'
                : 'border-transparent hover:text-slate-950 hover:border-slate-300'
            }`}
          >
            الرئيسية
          </button>
          <button
            type="button"
            onClick={() => onNavigateCategory('content-creation')}
            className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors duration-150 ${
              isContentActive
                ? 'border-amber-700 text-slate-950 font-semibold'
                : 'border-transparent hover:text-slate-950 hover:border-slate-300'
            }`}
          >
            صناعة المحتوى
          </button>
          <button
            type="button"
            onClick={() => onNavigateCategory('computer-gear')}
            className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors duration-150 ${
              isComputerActive
                ? 'border-amber-700 text-slate-950 font-semibold'
                : 'border-transparent hover:text-slate-950 hover:border-slate-300'
            }`}
          >
            معدات الكمبيوتر
          </button>
          <button
            type="button"
            onClick={onNavigateOwner}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors duration-150 ${
              isOwnerActive
                ? 'border-amber-700 text-slate-950 font-semibold'
                : 'border-transparent hover:text-slate-950 hover:border-slate-300'
            }`}
          >
            <Lock className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{isOwnerAuthenticated ? 'لوحة المالك' : 'دخول المالك'}</span>
          </button>
        </nav>

        {/* Zone 3: Primary Search + Mobile Owner Entry */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onNavigateOwner}
            className="md:hidden inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 text-slate-800 text-xs font-semibold hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <Lock className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{isOwnerAuthenticated ? 'لوحة المالك' : 'دخول المالك'}</span>
          </button>

          <button
            type="button"
            onClick={onOpenSearch}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700"
          >
            <Search className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>بحث سريع</span>
          </button>
        </div>
      </div>
    </header>
  );
}
