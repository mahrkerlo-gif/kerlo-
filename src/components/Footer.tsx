import { MainCategory, SiteSettings } from '../types/catalog';

interface FooterProps {
  categories: MainCategory[];
  settings: SiteSettings;
  isOwnerAuthenticated: boolean;
  onNavigateHome: () => void;
  onNavigateCategory: (categoryId: string) => void;
  onNavigateOwner: () => void;
}

export function Footer({
  categories,
  settings,
  isOwnerAuthenticated,
  onNavigateHome,
  onNavigateCategory,
  onNavigateOwner,
}: FooterProps) {
  return (
    <footer className="bg-white border-t border-slate-200 mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 text-right">
          <div className="md:col-span-6 space-y-3">
            <button
              type="button"
              onClick={onNavigateHome}
              className="inline-flex items-baseline gap-2.5"
            >
              <span className="font-display text-xl font-bold text-slate-950">
                {settings.brandArabic}
              </span>
              <span dir="ltr" className="font-latin text-xs font-bold tracking-widest text-amber-800">
                {settings.brandEnglish}
              </span>
            </button>
            <p className="text-sm text-slate-600 leading-relaxed max-w-md">
              {settings.footerAbout}
            </p>
          </div>

          <div className="md:col-span-6 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-sm font-bold text-slate-900">الأقسام الرئيسية</h3>
              <button
                type="button"
                onClick={onNavigateOwner}
                className="text-xs font-semibold text-amber-800 hover:text-amber-900 underline underline-offset-4"
              >
                {isOwnerAuthenticated ? 'لوحة المالك' : 'دخول المالك'}
              </button>
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-600">
              {categories.map((category) => (
                <li key={category.id}>
                  <button
                    type="button"
                    onClick={() => onNavigateCategory(category.id)}
                    className="hover:text-amber-800 transition-colors"
                  >
                    {category.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <p>
            © 2026 {settings.brandArabic} | {settings.brandEnglish} — جميع الحقوق محفوظة
          </p>
          <p>{settings.affiliateDisclosure}</p>
        </div>
      </div>
    </footer>
  );
}
