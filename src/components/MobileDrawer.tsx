import React, { useState } from 'react';
import { CategoryId, CategoryInfo, ContentPreference, ScreenId } from '../types';
import { CATEGORIES } from '../data';
import { ThemeMode } from '../utils/storage';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCategory: (id: CategoryId) => void;
  onNavigate: (screen: ScreenId) => void;
  onOpenUpload?: () => void;
  onOpenAds?: () => void;
  onOpenAdminPanel?: () => void;
  isAdminAuthenticated?: boolean;
  categories?: CategoryInfo[];
  userEmail?: string | null;
  onOpenSoftLogin?: (featureName?: string) => void;
  themeMode: ThemeMode;
  onToggleTheme: () => void;
  contentPreference: ContentPreference;
  onChangeContentPreference: (pref: ContentPreference) => void;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({
  isOpen,
  onClose,
  onSelectCategory,
  onNavigate,
  onOpenUpload,
  onOpenAds,
  onOpenAdminPanel,
  isAdminAuthenticated = false,
  categories = CATEGORIES,
  userEmail,
  onOpenSoftLogin,
  themeMode,
  onToggleTheme,
  contentPreference,
  onChangeContentPreference,
}) => {
  // Navigation view inside drawer: 'main' menu or 'categories' drill-down folder
  const [drawerSubView, setDrawerSubView] = useState<'main' | 'categories'>('main');
  const [isVideosExpanded, setIsVideosExpanded] = useState<boolean>(true);

  if (!isOpen) return null;

  const handleCategoryClick = (catId: CategoryId) => {
    onSelectCategory(catId);
    onClose();
    setDrawerSubView('main');
  };

  const handleHomeClick = () => {
    onNavigate('browse');
    onClose();
    setDrawerSubView('main');
  };

  const handlePerformersClick = () => {
    onNavigate('performers');
    onClose();
    setDrawerSubView('main');
  };

  const handleSignInClick = () => {
    onNavigate('signin');
    onClose();
    setDrawerSubView('main');
  };

  return (
    <div className="fixed inset-0 z-[9999] flex pointer-events-auto">
      {/* Dark Overlay Backdrop with Smooth Fade */}
      <div
        onClick={() => {
          onClose();
          setDrawerSubView('main');
        }}
        className="mobile-drawer-backdrop-anim fixed inset-0 bg-black/80 backdrop-blur-sm cursor-pointer z-10"
      />

      {/* Main Drawer Container matching Pornktube layout */}
      <aside className="mobile-drawer-aside mobile-drawer-anim relative w-[310px] max-w-[85vw] h-full bg-white dark:bg-[#121115] text-zinc-900 dark:text-zinc-100 flex flex-col z-20 shadow-[20px_0_60px_rgba(0,0,0,0.9)] border-r border-zinc-200 dark:border-white/10 select-none transition-colors">
        {/* ── TOP ACTION BAR (Theme Toggle + Login + Sign Up) ─────────── */}
        <div className="p-3 bg-zinc-100 dark:bg-[#18171d] border-b border-zinc-200 dark:border-white/10 flex items-center justify-between gap-2 shrink-0">
          {/* Day / Night Theme Switcher Pill */}
          <button
            type="button"
            onClick={onToggleTheme}
            className="w-10 h-10 rounded-xl bg-white dark:bg-[#2a2933] hover:bg-zinc-200 dark:hover:bg-[#34333f] text-[#ec4899] dark:text-[#ffb0cd] flex items-center justify-center transition-colors cursor-pointer border border-zinc-300 dark:border-white/10 active:scale-95 shrink-0 shadow-sm"
            title={themeMode === 'dark' ? 'Switch to Daytime Light Mode' : 'Switch to Nighttime Dark Mode'}
            aria-label="Toggle Theme Mode"
          >
            <span className="material-symbols-outlined text-[20px] text-[#ec4899] dark:text-[#ffb0cd]">
              {themeMode === 'dark' ? 'light_mode' : 'dark_mode'}
            </span>
          </button>

          {/* User Auth Buttons */}
          {userEmail ? (
            <div className="flex-1 flex items-center justify-end gap-2 overflow-hidden">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#2a2933] border border-zinc-200 dark:border-white/5 text-xs text-zinc-900 dark:text-zinc-200 truncate">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                <span className="truncate font-semibold text-[11px]">{userEmail.split('@')[0]}</span>
              </div>
              <button
                type="button"
                onClick={handleSignInClick}
                className="px-2.5 py-1.5 bg-[#ec4899] hover:bg-[#f751a1] text-white text-[11px] font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer shrink-0"
              >
                Profile
              </button>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleSignInClick}
                className="flex-1 py-2 px-3 bg-white hover:bg-zinc-200 dark:bg-[#2a2933] dark:hover:bg-[#34333f] border border-zinc-300 dark:border-white/10 rounded-lg text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-200 hover:text-black dark:hover:text-white transition-colors cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 shadow-sm"
              >
                <span className="material-symbols-outlined text-sm text-[#ec4899]">key</span>
                <span>LOGIN</span>
              </button>
              <button
                type="button"
                onClick={handleSignInClick}
                className="flex-1 py-2 px-3 bg-white hover:bg-zinc-200 dark:bg-[#2a2933] dark:hover:bg-[#34333f] border border-zinc-300 dark:border-white/10 rounded-lg text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-200 hover:text-black dark:hover:text-white transition-colors cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 shadow-sm"
              >
                <span className="material-symbols-outlined text-sm text-[#ec4899]">lock</span>
                <span>SIGN UP</span>
              </button>
            </div>
          )}
        </div>

        {/* ── DRAWER CONTENT BODY WITH SCROLL SUPPORT ────────────────── */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {drawerSubView === 'main' ? (
            /* ── VIEW 1: MAIN MENU VIEW ─────────────────────────────── */
            <ul className="py-2 divide-y divide-zinc-200 dark:divide-white/5 text-sm">
              {/* Home */}
              <li>
                <button
                  type="button"
                  onClick={handleHomeClick}
                  className="w-full px-5 py-3.5 flex items-center gap-3.5 text-zinc-900 dark:text-zinc-200 hover:text-black dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors cursor-pointer font-bold text-left active:bg-zinc-200 dark:active:bg-white/10"
                >
                  <span className="material-symbols-outlined text-lg text-zinc-600 dark:text-zinc-400">home</span>
                  <span>Home</span>
                </button>
              </li>

              {/* Videos Dropdown (Accordion) */}
              <li>
                <button
                  type="button"
                  onClick={() => setIsVideosExpanded(!isVideosExpanded)}
                  className="w-full px-5 py-3.5 flex items-center justify-between text-zinc-900 dark:text-zinc-200 hover:text-black dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors cursor-pointer font-bold text-left active:bg-zinc-200 dark:active:bg-white/10"
                >
                  <div className="flex items-center gap-3.5">
                    <span className="material-symbols-outlined text-lg text-zinc-600 dark:text-zinc-400">smart_display</span>
                    <span>Videos</span>
                  </div>
                  <span className={`material-symbols-outlined text-sm text-zinc-600 dark:text-zinc-400 transition-transform duration-200 ${isVideosExpanded ? 'rotate-180' : ''}`}>
                    expand_more
                  </span>
                </button>

                {/* Sub-items when Videos dropdown is expanded (Day/Night High Contrast) */}
                {isVideosExpanded && (
                  <ul className="bg-zinc-100 dark:bg-[#0c0c0f] py-1 border-t border-b border-zinc-200 dark:border-white/5 space-y-0.5 mobile-drawer-videos-sub">
                    <li>
                      <button
                        type="button"
                        onClick={() => {
                          onSelectCategory('all');
                          onClose();
                        }}
                        className="w-full pl-12 pr-5 py-2.5 flex items-center gap-3 text-zinc-900 dark:text-zinc-200 hover:text-[#ec4899] dark:hover:text-[#ffb0cd] hover:bg-zinc-200/80 dark:hover:bg-white/5 text-xs font-bold text-left transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-base text-amber-500">trophy</span>
                        <span className="text-zinc-900 dark:text-zinc-200 font-bold">Top Rated</span>
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        onClick={() => {
                          onSelectCategory('trending');
                          onClose();
                        }}
                        className="w-full pl-12 pr-5 py-2.5 flex items-center gap-3 text-zinc-900 dark:text-zinc-200 hover:text-[#ec4899] dark:hover:text-[#ffb0cd] hover:bg-zinc-200/80 dark:hover:bg-white/5 text-xs font-bold text-left transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-base text-rose-500">local_fire_department</span>
                        <span className="text-zinc-900 dark:text-zinc-200 font-bold">Most Popular</span>
                      </button>
                    </li>
                  </ul>
                )}
              </li>

              {/* All Categories Drill-Down Folder (Opens Full List View) */}
              <li>
                <button
                  type="button"
                  onClick={() => setDrawerSubView('categories')}
                  className="w-full px-5 py-3.5 flex items-center justify-between text-zinc-900 dark:text-zinc-200 hover:text-black dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors cursor-pointer font-bold text-left active:bg-zinc-200 dark:active:bg-white/10 group"
                >
                  <div className="flex items-center gap-3.5">
                    <span className="material-symbols-outlined text-lg text-zinc-600 dark:text-zinc-400 group-hover:text-[#ec4899] transition-colors">menu_book</span>
                    <span>All categories</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400 text-xs font-mono">
                    <span className="font-bold">({categories.length})</span>
                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                  </div>
                </button>
              </li>

              {/* Popular Categories (Quick Grid View) */}
              <li>
                <button
                  type="button"
                  onClick={() => {
                    onNavigate('categories');
                    onClose();
                  }}
                  className="w-full px-5 py-3.5 flex items-center gap-3.5 text-zinc-900 dark:text-zinc-200 hover:text-black dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors cursor-pointer font-bold text-left active:bg-zinc-200 dark:active:bg-white/10"
                >
                  <span className="material-symbols-outlined text-lg text-zinc-600 dark:text-zinc-400">inventory_2</span>
                  <span>Popular categories</span>
                </button>
              </li>

              {/* Pornstars / Performers */}
              <li>
                <button
                  type="button"
                  onClick={handlePerformersClick}
                  className="w-full px-5 py-3.5 flex items-center gap-3.5 text-zinc-900 dark:text-zinc-200 hover:text-black dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors cursor-pointer font-bold text-left active:bg-zinc-200 dark:active:bg-white/10"
                >
                  <span className="material-symbols-outlined text-lg text-zinc-600 dark:text-zinc-400">groups</span>
                  <span>Pornstars</span>
                </button>
              </li>

              {/* Saved Videos / Bookmarks */}
              <li>
                <button
                  type="button"
                  onClick={() => {
                    if (!userEmail && onOpenSoftLogin) {
                      onClose();
                      onOpenSoftLogin('Cloud Bookmarks & Playlists');
                    } else {
                      onNavigate('browse');
                      onClose();
                    }
                  }}
                  className="w-full px-5 py-3.5 flex items-center justify-between text-zinc-900 dark:text-zinc-200 hover:text-black dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors cursor-pointer font-bold text-left active:bg-zinc-200 dark:active:bg-white/10"
                >
                  <div className="flex items-center gap-3.5">
                    <span className="material-symbols-outlined text-lg text-[#ec4899]">bookmark</span>
                    <span>Saved Videos</span>
                  </div>
                  {!userEmail && (
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-zinc-200 dark:bg-white/10 text-zinc-700 dark:text-zinc-400">
                      Sync
                    </span>
                  )}
                </button>
              </li>

              {/* Admin Panel Quick Link (If staff/admin) */}
              {onOpenAdminPanel && (
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenAdminPanel();
                    }}
                    className={`w-full px-5 py-3.5 flex items-center gap-3.5 transition-colors font-bold text-left ${
                      isAdminAuthenticated
                        ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10'
                        : 'text-zinc-700 dark:text-zinc-400 hover:text-black dark:hover:text-white'
                    }`}
                  >
                    <span className="material-symbols-outlined text-lg">admin_panel_settings</span>
                    <span>{isAdminAuthenticated ? 'Admin Console' : 'Support / Admin'}</span>
                  </button>
                </li>
              )}

              {/* Upload Video Button */}
              {onOpenUpload && (
                <li className="p-3">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenUpload();
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 active:scale-95 transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">cloud_upload</span>
                    <span>Upload Video</span>
                  </button>
                </li>
              )}
            </ul>
          ) : (
            /* ── VIEW 2: CATEGORIES FOLDER DRILL-DOWN (Matches Screenshot 2) ─ */
            <div className="flex flex-col h-full animate-in slide-in-from-right-4 duration-200">
              {/* Back Button Header */}
              <div className="p-2.5 bg-zinc-100 dark:bg-[#18171d] border-b border-zinc-200 dark:border-white/10 flex items-center justify-between shrink-0">
                <button
                  type="button"
                  onClick={() => setDrawerSubView('main')}
                  className="px-3.5 py-1.5 rounded-lg bg-white dark:bg-[#2a2933] hover:bg-zinc-200 dark:hover:bg-[#353440] text-zinc-900 dark:text-zinc-200 font-bold text-xs uppercase flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95 border border-zinc-300 dark:border-transparent shadow-sm"
                >
                  <span className="material-symbols-outlined text-sm">arrow_back</span>
                  <span>Back</span>
                </button>
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-400 uppercase tracking-wider pr-2">
                  All Categories ({categories.length})
                </span>
              </div>

              {/* Scrollable Categories List (Pornktube Style Clean Rows) */}
              <ul className="divide-y divide-zinc-200 dark:divide-white/5 text-sm py-1">
                {categories.map((cat) => (
                  <li key={cat.id}>
                    <button
                      type="button"
                      onClick={() => handleCategoryClick(cat.id)}
                      className="w-full px-5 py-3 flex items-center justify-between text-zinc-900 dark:text-zinc-200 hover:text-[#ec4899] dark:hover:text-[#ffb0cd] hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors cursor-pointer text-left active:bg-zinc-200 dark:active:bg-white/10"
                    >
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-base text-[#ec4899]">
                          {cat.icon || 'folder'}
                        </span>
                        <span className="font-bold text-xs capitalize">{cat.name}</span>
                      </div>
                      <span className="material-symbols-outlined text-xs text-zinc-400 dark:text-zinc-600">chevron_right</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </aside>

      {/* ── EXTERNAL WHITE CLOSE BUTTON ON OVERLAY (Matches Screenshot 1) ─ */}
      <button
        type="button"
        onClick={() => {
          onClose();
          setDrawerSubView('main');
        }}
        className="relative z-20 m-3 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center cursor-pointer active:scale-90 transition-all border border-white/20 shadow-2xl self-start shrink-0"
        aria-label="Close menu"
        title="Close menu"
      >
        <span className="material-symbols-outlined text-2xl font-bold">close</span>
      </button>
    </div>
  );
};
