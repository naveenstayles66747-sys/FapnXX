import React from 'react';
import { CategoryId, CategoryInfo, ScreenId } from '../types';
import { CATEGORIES } from '../data';
import { useLanguage } from '../i18n/LanguageContext';

interface SidebarProps {
  currentScreen: ScreenId;
  selectedCategoryId: CategoryId;
  onSelectCategory: (id: CategoryId) => void;
  onNavigate: (screen: ScreenId) => void;
  categories?: CategoryInfo[];
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
  onOpenAdminPanel,
  isAdminAuthenticated = false,
  userEmail,
  onOpenSoftLogin,
}) => {
  const { t } = useLanguage();

  return (
    <nav className="hidden lg:flex flex-col justify-between w-64 bg-[#1c1b1d] border-r border-white/5 shrink-0 overflow-y-auto py-6 fixed left-0 top-20 h-[calc(100vh-5rem)] z-40">
      <div className="space-y-2">
        <div className="px-6 mb-2">
          <h2 className="text-xs font-semibold text-[#debec8] uppercase tracking-widest">
            {t.categories}
          </h2>
        </div>

        <ul className="space-y-1 px-3">
          <li>
            <button
              onClick={() => {
                onNavigate('browse');
              }}
              className={`sidebar-link-interactive w-full flex items-center gap-3.5 px-4 py-3 rounded-lg font-semibold text-xs tracking-wide cursor-pointer ${
                currentScreen === 'browse' && selectedCategoryId === 'all'
                  ? 'bg-[#f751a1]/20 text-[#ffb0cd] border-l-4 border-[#ffb0cd]'
                  : 'text-[#debec8] hover:bg-white/5 hover:text-white'
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

            return (
              <li key={cat.id}>
                <button
                  onClick={() => {
                    onSelectCategory(cat.id);
                  }}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-lg font-semibold text-xs tracking-wide transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#f751a1]/20 text-[#ffb0cd] border-l-4 border-[#ffb0cd]'
                      : 'text-[#debec8] hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span
                    className="material-symbols-outlined text-xl"
                    style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    {cat.icon}
                  </span>
                  <span>{cat.name}</span>
                </button>
              </li>
            );
          })}

          <li className="pt-4 border-t border-white/5 mt-4 space-y-1">
            <button
              onClick={() => onNavigate('performers')}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-lg font-semibold text-xs tracking-wide transition-all cursor-pointer ${
                currentScreen === 'performers'
                  ? 'bg-[#f751a1]/20 text-[#ffb0cd] border-l-4 border-[#ffb0cd]'
                  : 'text-[#debec8] hover:bg-white/5 hover:text-white'
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
              className="w-full flex items-center gap-3.5 px-4 py-3 rounded-lg font-semibold text-xs tracking-wide text-[#debec8] hover:bg-white/5 hover:text-white transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-xl text-[#ec4899]">
                bookmark_add
              </span>
              <span>{t.saved}</span>
              {!userEmail && (
                <span className="ml-auto text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-white/10 text-[#a19fa6]">
                  Sync
                </span>
              )}
            </button>
          </li>
        </ul>
      </div>

      {/* Admin Quick Entry in Sidebar */}
      {onOpenAdminPanel && (
        <div className="px-3 pt-4 border-t border-white/5 mt-auto">
          <button
            onClick={onOpenAdminPanel}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              isAdminAuthenticated
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-[#27272a] text-[#ffb0cd] hover:bg-[#3f3f46]'
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
