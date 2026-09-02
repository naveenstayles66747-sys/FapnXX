import React from 'react';
import { CategoryId, CategoryInfo, ScreenId, Video } from '../types';
import { CATEGORIES, VIDEOS } from '../data';
import { useLanguage } from '../i18n/LanguageContext';

interface SidebarProps {
  currentScreen: ScreenId;
  selectedCategoryId: CategoryId;
  onSelectCategory: (id: CategoryId) => void;
  onNavigate: (screen: ScreenId) => void;
  categories?: CategoryInfo[];
  videos?: Video[];
  onOpenAdminPanel?: () => void;
  isAdminAuthenticated?: boolean;
  userEmail?: string | null;
  onOpenSoftLogin?: (featureName?: string) => void;
}

const SidebarComponent: React.FC<SidebarProps> = ({
  currentScreen,
  selectedCategoryId,
  onSelectCategory,
  onNavigate,
  categories = CATEGORIES,
  videos = VIDEOS,
  onOpenAdminPanel,
  isAdminAuthenticated = false,
  userEmail,
  onOpenSoftLogin,
}) => {
  const { t } = useLanguage();

  const categoryCountMap = React.useMemo(() => {
    const counts: Record<string, number> = {};
    const list = videos && videos.length > 0 ? videos : VIDEOS;

    categories.forEach((cat) => {
      const lowerId = cat.id.toLowerCase();
      if (lowerId === 'trending') {
        counts[cat.id] = list.length;
      } else {
        const matching = list.filter((v) => {
          if (!v) return false;
          if (v.category && v.category.toLowerCase() === lowerId) return true;
          if (Array.isArray(v.categories) && v.categories.some((c) => c && c.toLowerCase() === lowerId)) return true;
          return false;
        });
        counts[cat.id] = matching.length > 0 ? matching.length : 75;
      }
    });
    return counts;
  }, [categories, videos]);

  return (
    <nav className="hidden lg:flex flex-col justify-between w-64 bg-zinc-50 dark:bg-[#1c1b1d] border-r border-zinc-200 dark:border-white/5 shrink-0 overflow-y-auto py-6 fixed left-0 top-20 h-[calc(100vh-5rem)] z-40 transition-colors">
      <div className="space-y-2">
        <div className="px-6 mb-2">
          <h2 className="text-xs font-bold text-zinc-700 dark:text-[#debec8] uppercase tracking-widest">
            {t.categories}
          </h2>
        </div>

        <ul className="space-y-1 px-3">
          <li>
            <button
              onClick={() => {
                onNavigate('browse');
              }}
              className={`sidebar-link-interactive w-full flex items-center gap-3.5 px-4 py-3 rounded-lg font-semibold text-xs tracking-wide cursor-pointer transition-all ${
                currentScreen === 'browse' && selectedCategoryId === 'all'
                  ? 'bg-[#ec4899]/15 text-[#ec4899] dark:text-[#ffb0cd] border-l-4 border-[#ec4899] dark:border-[#ffb0cd]'
                  : 'text-zinc-800 dark:text-[#debec8] hover:bg-zinc-200/80 dark:hover:bg-white/5 hover:text-zinc-950 dark:hover:text-white'
              }`}
            >
              <span
                className="material-symbols-outlined text-xl"
                style={{ fontVariationSettings: currentScreen === 'browse' && selectedCategoryId === 'all' ? "'FILL' 1" : "'FILL' 0" }}
              >
                home
              </span>
              <span>{t.browse}</span>
            </button>
          </li>

          {categories.map((cat) => {
            const isActive =
              (currentScreen === 'category-detail' && selectedCategoryId === cat.id) ||
              (currentScreen === 'browse' && selectedCategoryId === cat.id);
            const count = categoryCountMap[cat.id] ?? 75;

            return (
              <li key={cat.id}>
                <button
                  onClick={() => {
                    onSelectCategory(cat.id);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg font-semibold text-xs tracking-wide transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#ec4899]/15 text-[#ec4899] dark:text-[#ffb0cd] border-l-4 border-[#ec4899] dark:border-[#ffb0cd]'
                      : 'text-zinc-800 dark:text-[#debec8] hover:bg-zinc-200/80 dark:hover:bg-white/5 hover:text-zinc-950 dark:hover:text-white'
                  }`}
                >
                  <span className="truncate">{cat.name} - {count} videos</span>
                </button>
              </li>
            );
          })}

          <li className="pt-4 border-t border-zinc-200 dark:border-white/5 mt-4 space-y-1">
            <button
              onClick={() => onNavigate('performers')}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-lg font-semibold text-xs tracking-wide transition-all cursor-pointer ${
                currentScreen === 'performers'
                  ? 'bg-[#ec4899]/15 text-[#ec4899] dark:text-[#ffb0cd] border-l-4 border-[#ec4899] dark:border-[#ffb0cd]'
                  : 'text-zinc-800 dark:text-[#debec8] hover:bg-zinc-200/80 dark:hover:bg-white/5 hover:text-zinc-950 dark:hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-xl">
                groups
              </span>
              <span>{t.performers}</span>
            </button>

            <button
              onClick={() => {
                if (!userEmail) {
                  if (onOpenSoftLogin) onOpenSoftLogin('Cloud Bookmarks & Playlists');
                } else {
                  onNavigate('browse');
                }
              }}
              className="w-full flex items-center gap-3.5 px-4 py-3 rounded-lg font-semibold text-xs tracking-wide text-zinc-600 dark:text-[#debec8] hover:bg-zinc-200/60 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-white transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-xl text-[#ec4899]">
                bookmark_add
              </span>
              <span>{t.saved}</span>
              {!userEmail && (
                <span className="ml-auto text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-white/10 text-zinc-600 dark:text-[#a19fa6]">
                  Sync
                </span>
              )}
            </button>
          </li>
        </ul>
      </div>

      {/* Admin Quick Entry in Sidebar */}
      {onOpenAdminPanel && (
        <div className="px-3 pt-4 border-t border-zinc-200 dark:border-white/5 mt-auto">
          <button
            onClick={onOpenAdminPanel}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              isAdminAuthenticated
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-zinc-200 dark:bg-[#27272a] text-zinc-800 dark:text-[#ffb0cd] hover:bg-zinc-300 dark:hover:bg-[#3f3f46]'
            }`}
          >
            <span className="material-symbols-outlined text-lg">admin_panel_settings</span>
            <span>{isAdminAuthenticated ? 'Admin Console' : t.admin}</span>
          </button>
        </div>
      )}
    </nav>
  );
};

export const Sidebar = React.memo(SidebarComponent);
export default Sidebar;
