import React, { useState, useEffect, useMemo } from 'react';
import { CategoryId, CategoryInfo, ContentPreference, ScreenId, Video } from '../types';
import { CATEGORIES, VIDEOS } from '../data';
import { ThemeMode } from '../utils/storage';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCategory: (id: CategoryId) => void;
  onNavigate: (screen: ScreenId) => void;
  onSelectSort?: (sort: 'latest' | 'most_popular' | 'top_rated') => void;
  onOpenUpload?: () => void;
  onOpenAds?: () => void;
  onOpenAdminPanel?: () => void;
  isAdminAuthenticated?: boolean;
  categories?: CategoryInfo[];
  videos?: Video[];
  userEmail?: string | null;
  onSignOut?: () => void;
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
  onSelectSort,
  onOpenUpload,
  onOpenAds,
  onOpenAdminPanel,
  isAdminAuthenticated = false,
  categories = CATEGORIES,
  videos = VIDEOS,
  userEmail,
  onSignOut,
  onOpenSoftLogin,
  themeMode,
  onToggleTheme,
  contentPreference,
  onChangeContentPreference,
}) => {
  // Navigation view inside drawer: 'main' menu or 'categories' drill-down folder
  const [drawerSubView, setDrawerSubView] = useState<'main' | 'categories'>('main');
  const [isVideosExpanded, setIsVideosExpanded] = useState<boolean>(false);

  // Reset drawer state when opened/closed so Videos dropdown is closed by default
  useEffect(() => {
    if (isOpen) {
      setDrawerSubView('main');
      setIsVideosExpanded(false);
    }
  }, [isOpen]);

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
        counts[cat.id] = matching.length;
      }
    });
    return counts;
  }, [categories, videos]);

  if (!isOpen) return null;

  const handleCategoryClick = (catId: CategoryId) => {
    onSelectCategory(catId);
    onClose();
    setDrawerSubView('main');
    setIsVideosExpanded(false);
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

      {/* Main Drawer Container */}
      <aside className="mobile-drawer-aside mobile-drawer-anim relative w-[320px] max-w-[85vw] h-full bg-white dark:bg-[#131217] text-zinc-900 dark:text-white flex flex-col z-20 shadow-[20px_0_60px_rgba(0,0,0,0.95)] border-r border-zinc-200 dark:border-white/10 select-none transition-colors">
        {/* ── TOP ACTION BAR (Theme Toggle + Login + Sign Up + Close) ─────────── */}
        <div className="p-3 border-b border-zinc-200 dark:border-white/10 flex items-center justify-between gap-2 shrink-0 bg-zinc-100 dark:bg-[#18171d]">
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Day / Night Theme Switcher Pill */}
            <button
              type="button"
              onClick={onToggleTheme}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors cursor-pointer active:scale-95 shrink-0 shadow-sm bg-white hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-amber-500 dark:text-amber-400 border border-zinc-300 dark:border-white/10"
              title={themeMode === 'dark' ? 'Switch to Daytime Light Mode' : 'Switch to Nighttime Dark Mode'}
              aria-label="Toggle Theme Mode"
            >
              <span className="material-symbols-outlined text-[18px]">
                {themeMode === 'dark' ? 'light_mode' : 'dark_mode'}
              </span>
            </button>
          </div>

          {/* User Auth Buttons */}
          {userEmail ? (
            <div className="flex-1 flex items-center justify-end gap-1.5 overflow-hidden">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-white/10 text-xs text-zinc-900 dark:text-zinc-100 truncate shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 shrink-0" />
                <span className="truncate font-semibold text-[11px]">{userEmail.split('@')[0]}</span>
              </div>
              <button
                type="button"
                onClick={handleSignInClick}
                className="px-2.5 py-1.5 bg-[#ec4899] hover:bg-[#f751a1] text-white text-[11px] font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer shrink-0 shadow-sm"
              >
                Profile
              </button>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={handleSignInClick}
                className="flex-1 py-2 px-2.5 rounded-lg text-[11px] font-extrabold uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1 active:scale-95 shadow-sm bg-white hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-white/10"
              >
                <span className="material-symbols-outlined text-xs text-rose-500 dark:text-rose-400">key</span>
                <span>LOGIN</span>
              </button>
              <button
                type="button"
                onClick={handleSignInClick}
                className="flex-1 py-2 px-2.5 rounded-lg text-[11px] font-extrabold uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1 active:scale-95 shadow-sm bg-white hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-white/10"
              >
                <span className="material-symbols-outlined text-xs text-pink-500 dark:text-pink-400">lock</span>
                <span>SIGN UP</span>
              </button>
            </div>
          )}

          {/* Close Drawer Button */}
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-white hover:bg-rose-600 text-zinc-800 hover:text-white dark:bg-zinc-800 dark:hover:bg-rose-600 dark:text-zinc-300 transition-colors cursor-pointer active:scale-95 shrink-0 shadow-sm border border-zinc-300 dark:border-white/10 ml-1"
            title="Close menu"
            aria-label="Close menu"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
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
                  className="w-full px-5 py-3.5 flex items-center gap-3.5 text-zinc-900 hover:text-[#ec4899] hover:bg-zinc-100 dark:text-zinc-100 dark:hover:text-white dark:hover:bg-white/10 transition-colors cursor-pointer font-bold text-left active:bg-zinc-200 dark:active:bg-white/15"
                >
                  <span className="material-symbols-outlined text-xl text-[#ec4899]">home</span>
                  <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Home</span>
                </button>
              </li>

              {/* Brazzers Exclusive Channel Feature */}
              <li>
                <button
                  type="button"
                  onClick={() => {
                    onNavigate('brazzers');
                    onClose();
                  }}
                  className="w-full px-5 py-3.5 flex items-center justify-between transition-colors cursor-pointer font-bold text-left text-amber-500 dark:text-amber-400 hover:bg-amber-500/10 dark:hover:bg-amber-500/15 active:bg-amber-500/20 dark:active:bg-amber-500/25"
                >
                  <div className="flex items-center gap-3.5">
                    <span className="material-symbols-outlined text-xl text-amber-500 dark:text-amber-400">workspace_premium</span>
                    <span className="text-sm font-bold text-amber-600 dark:text-amber-400">Brazzers Edition</span>
                  </div>
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-amber-500 text-black shadow-sm">
                    VIP
                  </span>
                </button>
              </li>

              {/* Videos Dropdown (Accordion) */}
              <li>
                <button
                  type="button"
                  onClick={() => setIsVideosExpanded(!isVideosExpanded)}
                  className="w-full px-5 py-3.5 flex items-center justify-between text-zinc-900 hover:text-[#ec4899] hover:bg-zinc-100 dark:text-zinc-100 dark:hover:text-white dark:hover:bg-white/10 transition-colors cursor-pointer font-bold text-left active:bg-zinc-200 dark:active:bg-white/15"
                >
                  <div className="flex items-center gap-3.5">
                    <span className="material-symbols-outlined text-xl text-[#a855f7]">smart_display</span>
                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Videos</span>
                  </div>
                  <span className={`material-symbols-outlined text-sm text-zinc-500 dark:text-zinc-400 transition-transform duration-200 ${isVideosExpanded ? 'rotate-180' : ''}`}>
                    expand_more
                  </span>
                </button>

                {/* Sub-items when Videos dropdown is expanded */}
                {isVideosExpanded && (
                  <ul className="py-1 border-t border-b border-zinc-200 dark:border-white/10 bg-zinc-100 dark:bg-black/40 space-y-0.5">
                    <li>
                      <button
                        type="button"
                        onClick={() => {
                          onSelectCategory('all');
                          if (onSelectSort) onSelectSort('top_rated');
                          onNavigate('browse');
                          onClose();
                          setDrawerSubView('main');
                          setIsVideosExpanded(false);
                        }}
                        className="w-full pl-12 pr-5 py-2.5 flex items-center gap-3 text-xs font-bold text-left text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer hover:text-amber-600 dark:hover:text-amber-400 hover:bg-zinc-200 dark:hover:bg-white/5"
                      >
                        <span className="material-symbols-outlined text-base text-amber-500 dark:text-amber-400">trophy</span>
                        <span>Top Rated</span>
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        onClick={() => {
                          onSelectCategory('all');
                          if (onSelectSort) onSelectSort('most_popular');
                          onNavigate('browse');
                          onClose();
                          setDrawerSubView('main');
                          setIsVideosExpanded(false);
                        }}
                        className="w-full pl-12 pr-5 py-2.5 flex items-center gap-3 text-xs font-bold text-left text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer hover:text-rose-600 dark:hover:text-rose-400 hover:bg-zinc-200 dark:hover:bg-white/5"
                      >
                        <span className="material-symbols-outlined text-base text-rose-500 dark:text-rose-400">local_fire_department</span>
                        <span>Most Popular</span>
                      </button>
                    </li>
                  </ul>
                )}
              </li>

              {/* All Categories Drill-Down Folder */}
              <li>
                <button
                  type="button"
                  onClick={() => setDrawerSubView('categories')}
                  className="w-full px-5 py-3.5 flex items-center justify-between text-zinc-900 hover:text-[#06b6d4] hover:bg-zinc-100 dark:text-zinc-100 dark:hover:text-white dark:hover:bg-white/10 transition-colors cursor-pointer font-bold text-left active:bg-zinc-200 dark:active:bg-white/15 group"
                >
                  <div className="flex items-center gap-3.5">
                    <span className="material-symbols-outlined text-xl text-[#06b6d4] group-hover:text-cyan-500 dark:group-hover:text-cyan-300 transition-colors">menu_book</span>
                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">All categories</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-mono">
                    <span className="font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-100 dark:bg-cyan-950/60 border border-cyan-300 dark:border-cyan-500/30 px-2 py-0.5 rounded-md">({categories.length})</span>
                    <span className="material-symbols-outlined text-sm text-zinc-400 group-hover:text-cyan-500">chevron_right</span>
                  </div>
                </button>
              </li>

              {/* Popular Categories */}
              <li>
                <button
                  type="button"
                  onClick={() => {
                    onNavigate('categories');
                    onClose();
                  }}
                  className="w-full px-5 py-3.5 flex items-center gap-3.5 text-zinc-900 hover:text-[#10b981] hover:bg-zinc-100 dark:text-zinc-100 dark:hover:text-white dark:hover:bg-white/10 transition-colors cursor-pointer font-bold text-left active:bg-zinc-200 dark:active:bg-white/15"
                >
                  <span className="material-symbols-outlined text-xl text-[#10b981]">inventory_2</span>
                  <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Popular categories</span>
                </button>
              </li>

              {/* Pornstars / Performers */}
              <li>
                <button
                  type="button"
                  onClick={handlePerformersClick}
                  className="w-full px-5 py-3.5 flex items-center gap-3.5 text-zinc-900 hover:text-[#f43f5e] hover:bg-zinc-100 dark:text-zinc-100 dark:hover:text-white dark:hover:bg-white/10 transition-colors cursor-pointer font-bold text-left active:bg-zinc-200 dark:active:bg-white/15"
                >
                  <span className="material-symbols-outlined text-xl text-[#f43f5e]">groups</span>
                  <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Pornstars</span>
                </button>
              </li>

              {/* Content Preference Filter (Straight / Gay / Lesbian) */}
              <li className="px-5 py-3.5 border-b border-zinc-200 dark:border-white/10 space-y-2 bg-zinc-100 dark:bg-black/20">
                <div className="flex items-center justify-between text-[11px] font-extrabold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-[#e0358d]">tune</span>
                    <span>Content Filter</span>
                  </span>
                  <span className="text-[#ec4899] font-mono text-[10px] uppercase font-black bg-pink-100 dark:bg-pink-950/60 border border-pink-300 dark:border-pink-500/30 px-1.5 py-0.5 rounded">{contentPreference}</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-white/10 shadow-inner">
                  {([
                    { id: 'straight', label: 'Straight', icon: 'wc' },
                    { id: 'gay', label: 'Gay', icon: 'male' },
                    { id: 'lesbian', label: 'Lesbian', icon: 'female' },
                  ] as const).map((pref) => {
                    const isSelected = contentPreference === pref.id;
                    return (
                      <button
                        key={pref.id}
                        type="button"
                        onClick={() => {
                          onChangeContentPreference(pref.id);
                          onClose();
                          onNavigate('browse');
                        }}
                        className={`py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                          isSelected
                            ? 'bg-gradient-to-r from-[#e0358d] to-[#ec4899] text-white shadow-md font-extrabold'
                            : 'text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:text-white dark:hover:bg-white/10'
                        }`}
                      >
                        <span className="material-symbols-outlined text-sm">{pref.icon}</span>
                        <span>{pref.label}</span>
                      </button>
                    );
                  })}
                </div>
              </li>

              {/* Saved Videos / Bookmarks */}
              <li>
                <button
                  type="button"
                  onClick={() => {
                    onNavigate('saved');
                    onClose();
                  }}
                  className="w-full px-5 py-3.5 flex items-center justify-between text-zinc-900 hover:text-[#ec4899] hover:bg-zinc-100 dark:text-zinc-100 dark:hover:text-white dark:hover:bg-white/10 transition-colors cursor-pointer font-bold text-left active:bg-zinc-200 dark:active:bg-white/15"
                >
                  <div className="flex items-center gap-3.5">
                    <span className="material-symbols-outlined text-xl text-[#ec4899]">bookmark</span>
                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Saved Videos</span>
                  </div>
                  {!userEmail && (
                    <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded bg-zinc-200 text-zinc-700 border border-zinc-300 dark:bg-white/10 dark:text-zinc-300 dark:border-white/10">
                      Sync
                    </span>
                  )}
                </button>
              </li>

              {/* User Account / Sign In / Sign Out */}
              {userEmail ? (
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      if (onSignOut) onSignOut();
                    }}
                    className="w-full px-5 py-3.5 flex items-center justify-between text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/15 transition-colors font-bold text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5">
                      <span className="material-symbols-outlined text-xl text-rose-600 dark:text-rose-400">logout</span>
                      <span className="text-sm font-bold text-rose-600 dark:text-rose-300">Sign Out ({userEmail.split('@')[0]})</span>
                    </div>
                  </button>
                </li>
              ) : (
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigate('signin');
                    }}
                    className="w-full px-5 py-3.5 flex items-center gap-3.5 text-zinc-900 hover:text-emerald-600 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:text-white dark:hover:bg-white/10 transition-colors cursor-pointer font-bold text-left"
                  >
                    <span className="material-symbols-outlined text-xl text-emerald-500 dark:text-emerald-400">login</span>
                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Sign In / Create Account</span>
                  </button>
                </li>
              )}

              {/* Admin Panel Quick Link */}
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
                        ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10'
                        : 'text-zinc-800 hover:text-zinc-950 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:text-white dark:hover:bg-white/10'
                    }`}
                  >
                    <span className="material-symbols-outlined text-xl text-blue-500 dark:text-blue-400">admin_panel_settings</span>
                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{isAdminAuthenticated ? 'Admin Console' : 'Support / Admin'}</span>
                  </button>
                </li>
              )}

              {/* Upload Video Button */}
              {onOpenUpload && (
                <li className="p-4">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenUpload();
                    }}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 active:scale-95 transition-all cursor-pointer border border-white/20"
                  >
                    <span className="material-symbols-outlined text-lg">cloud_upload</span>
                    <span>Upload Video</span>
                  </button>
                </li>
              )}
            </ul>
          ) : (
            /* ── VIEW 2: CATEGORIES FOLDER DRILL-DOWN ───────────────── */
            <div className="flex flex-col h-full animate-in slide-in-from-right-4 duration-200">
              {/* Back Button Header */}
              <div className="p-3 border-b border-zinc-200 dark:border-white/10 flex items-center justify-between shrink-0 bg-zinc-100 dark:bg-[#18171d]">
                <button
                  type="button"
                  onClick={() => setDrawerSubView('main')}
                  className="px-3.5 py-1.5 rounded-lg font-bold text-xs uppercase flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95 shadow-sm bg-white hover:bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-100 border border-zinc-300 dark:border-white/10"
                >
                  <span className="material-symbols-outlined text-sm text-[#ec4899]">arrow_back</span>
                  <span>Back</span>
                </button>
                <span className="text-xs font-extrabold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider pr-2">
                  All Categories ({categories.length})
                </span>
              </div>

              {/* Scrollable Categories List */}
              <ul className="divide-y divide-zinc-200 dark:divide-white/5 text-sm py-1">
                {categories.map((cat) => {
                  const count = categoryCountMap[cat.id] ?? 0;
                  return (
                    <li key={cat.id}>
                      <button
                        type="button"
                        onClick={() => handleCategoryClick(cat.id)}
                        className="w-full px-5 py-3.5 flex items-center justify-between text-zinc-900 hover:text-[#ec4899] hover:bg-zinc-100 dark:text-zinc-100 dark:hover:text-[#ec4899] dark:hover:bg-white/5 transition-colors cursor-pointer text-left active:bg-zinc-200 dark:active:bg-white/10 group"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="material-symbols-outlined text-lg text-[#ec4899]">{cat.icon || 'category'}</span>
                          <span className="font-bold text-xs capitalize text-zinc-900 dark:text-zinc-100 group-hover:text-[#ec4899] transition-colors">
                            {cat.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-mono font-semibold text-zinc-700 bg-zinc-200 dark:text-zinc-400 dark:bg-white/5 px-2 py-0.5 rounded">
                            {count}
                          </span>
                          <span className="material-symbols-outlined text-xs text-zinc-400 group-hover:text-[#ec4899] transition-colors">chevron_right</span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};
