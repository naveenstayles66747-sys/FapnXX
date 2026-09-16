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
      <aside className={`mobile-drawer-aside mobile-drawer-anim relative w-[320px] max-w-[85vw] h-full flex flex-col z-20 transition-colors border-r overscroll-contain ${
        themeMode === 'light'
          ? 'bg-white text-slate-900 border-slate-200 shadow-[10px_0_40px_rgba(0,0,0,0.15)]'
          : 'bg-[#131217] text-white border-white/10 shadow-[20px_0_60px_rgba(0,0,0,0.95)]'
      }`}>
        {/* ── TOP ACTION BAR (Theme Toggle + Login + Sign Up + Close OR Back Header in Categories View) ─────────── */}
        {drawerSubView === 'main' ? (
          <div className={`mobile-drawer-top-bar p-3 border-b flex items-center justify-between gap-2 shrink-0 ${
            themeMode === 'light' ? 'bg-slate-100 border-slate-200 text-slate-900' : 'bg-[#18171d] border-white/10 text-white'
          }`}>
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Day / Night Theme Switcher Pill */}
              <button
                type="button"
                onClick={onToggleTheme}
                className={`mobile-drawer-theme-btn w-9 h-9 rounded-xl flex items-center justify-center transition-colors cursor-pointer active:scale-95 shrink-0 shadow-sm border ${
                  themeMode === 'light'
                    ? 'bg-white hover:bg-slate-200 text-amber-500 border-slate-300'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-amber-400 border-white/10'
                }`}
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
                <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs truncate shadow-sm ${
                  themeMode === 'light'
                    ? 'bg-white border-slate-300 text-slate-900'
                    : 'bg-zinc-800 border-white/10 text-zinc-100'
                }`}>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
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
                  className={`mobile-drawer-auth-btn flex-1 py-2 px-2.5 rounded-lg text-[11px] font-extrabold uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1 active:scale-95 shadow-sm border ${
                    themeMode === 'light'
                      ? 'bg-white hover:bg-slate-200 text-slate-900 border-slate-300'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border-white/10'
                  }`}
                >
                  <span className="material-symbols-outlined text-xs text-rose-500">key</span>
                  <span className={themeMode === 'light' ? 'text-slate-900 font-extrabold' : 'text-zinc-100'}>LOGIN</span>
                </button>
                <button
                  type="button"
                  onClick={handleSignInClick}
                  className={`mobile-drawer-auth-btn flex-1 py-2 px-2.5 rounded-lg text-[11px] font-extrabold uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1 active:scale-95 shadow-sm border ${
                    themeMode === 'light'
                      ? 'bg-white hover:bg-slate-200 text-slate-900 border-slate-300'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border-white/10'
                  }`}
                >
                  <span className="material-symbols-outlined text-xs text-pink-500">lock</span>
                  <span className={themeMode === 'light' ? 'text-slate-900 font-extrabold' : 'text-zinc-100'}>SIGN UP</span>
                </button>
              </div>
            )}

            {/* Close Drawer Button */}
            <button
              type="button"
              onClick={onClose}
              className={`mobile-drawer-close-btn w-9 h-9 rounded-xl flex items-center justify-center transition-colors cursor-pointer active:scale-95 shrink-0 shadow-sm border ml-1 ${
                themeMode === 'light'
                  ? 'bg-white hover:bg-rose-600 text-slate-800 hover:text-white border-slate-300'
                  : 'bg-zinc-800 hover:bg-rose-600 text-zinc-300 hover:text-white border-white/10'
              }`}
              title="Close menu"
              aria-label="Close menu"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        ) : (
          /* ── TOP ACTION BAR FOR CATEGORIES FOLDER VIEW (Back Button + Header + Close Button) ── */
          <div className={`mobile-drawer-top-bar mobile-drawer-back-header p-3 border-b flex items-center justify-between gap-2 shrink-0 ${
            themeMode === 'light' ? 'bg-slate-100 border-slate-200' : 'bg-[#18171d] border-white/10'
          }`}>
            <button
              type="button"
              onClick={() => setDrawerSubView('main')}
              className={`mobile-drawer-auth-btn mobile-drawer-back-btn px-3 py-1.5 rounded-lg font-bold text-xs uppercase flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95 shadow-sm border ${
                themeMode === 'light'
                  ? 'bg-white hover:bg-slate-200 text-slate-900 border-slate-300'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border-white/10'
              }`}
            >
              <span className="material-symbols-outlined text-sm text-[#ec4899]">arrow_back</span>
              <span>Back</span>
            </button>
            <span className={`text-xs font-extrabold uppercase tracking-wider truncate px-1 ${
              themeMode === 'light' ? 'text-slate-900' : 'text-zinc-200'
            }`}>
              All Categories ({categories.length})
            </span>
            <button
              type="button"
              onClick={onClose}
              className={`mobile-drawer-close-btn w-9 h-9 rounded-xl flex items-center justify-center transition-colors cursor-pointer active:scale-95 shrink-0 shadow-sm border ml-1 ${
                themeMode === 'light'
                  ? 'bg-white hover:bg-rose-600 text-slate-800 hover:text-white border-slate-300'
                  : 'bg-zinc-800 hover:bg-rose-600 text-zinc-300 hover:text-white border-white/10'
              }`}
              title="Close menu"
              aria-label="Close menu"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        )}

        {/* ── DRAWER CONTENT BODY WITH FLUID SCROLL SUPPORT ────────────────── */}
        <div 
          data-lenis-prevent="true"
          className="flex-1 overflow-y-auto overscroll-contain touch-pan-y custom-scrollbar min-h-0"
          style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
        >
          {drawerSubView === 'main' ? (
            /* ── VIEW 1: MAIN MENU VIEW ─────────────────────────────── */
            <ul className={`py-2 pb-24 divide-y text-sm ${
              themeMode === 'light' ? 'divide-slate-200 text-slate-900' : 'divide-white/5 text-white'
            }`}>
              {/* Home */}
              <li className="drawer-item-stagger">
                <button
                  type="button"
                  onClick={handleHomeClick}
                  className={`sidebar-interactive-pill w-full px-5 py-3.5 flex items-center gap-3.5 transition-colors cursor-pointer font-bold text-left ${
                    themeMode === 'light'
                      ? 'text-slate-900 hover:text-[#ec4899] hover:bg-slate-100 active:bg-slate-200'
                      : 'text-zinc-100 hover:text-white hover:bg-white/10 active:bg-white/15'
                  }`}
                >
                  <span className="material-symbols-outlined text-xl text-[#ec4899]">home</span>
                  <span className={`text-sm font-bold ${themeMode === 'light' ? 'text-slate-900' : 'text-zinc-100'}`}>Home</span>
                </button>
              </li>

              {/* Brazzers Exclusive Channel Feature */}
              <li className="drawer-item-stagger">
                <button
                  type="button"
                  onClick={() => {
                    onNavigate('brazzers');
                    onClose();
                  }}
                  className={`sidebar-interactive-pill w-full px-5 py-3.5 flex items-center justify-between transition-colors cursor-pointer font-bold text-left ${
                    themeMode === 'light'
                      ? 'text-amber-600 hover:bg-amber-50 active:bg-amber-100'
                      : 'text-amber-400 hover:bg-amber-500/15 active:bg-amber-500/25'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <span className="material-symbols-outlined text-xl text-amber-500">workspace_premium</span>
                    <span className={`text-sm font-bold ${themeMode === 'light' ? 'text-amber-700' : 'text-amber-400'}`}>Brazzers Edition</span>
                  </div>
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-amber-500 text-black shadow-sm">
                    VIP
                  </span>
                </button>
              </li>

              {/* Videos Dropdown (Smooth Pure CSS Grid Accordion) */}
              <li className="drawer-item-stagger">
                <button
                  type="button"
                  onClick={() => setIsVideosExpanded(!isVideosExpanded)}
                  className={`sidebar-interactive-pill w-full px-5 py-3.5 flex items-center justify-between transition-colors cursor-pointer font-bold text-left ${
                    themeMode === 'light'
                      ? 'text-slate-900 hover:text-[#ec4899] hover:bg-slate-100 active:bg-slate-200'
                      : 'text-zinc-100 hover:text-white hover:bg-white/10 active:bg-white/15'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <span className="material-symbols-outlined text-xl text-[#a855f7]">smart_display</span>
                    <span className={`text-sm font-bold ${themeMode === 'light' ? 'text-slate-900' : 'text-zinc-100'}`}>Videos</span>
                  </div>
                  <span className={`material-symbols-outlined text-sm transition-transform duration-300 ease-out ${
                    themeMode === 'light' ? 'text-slate-500' : 'text-zinc-400'
                  } ${isVideosExpanded ? 'rotate-180 text-[#a855f7]' : ''}`}>
                    expand_more
                  </span>
                </button>

                {/* Smooth CSS Grid Dropdown Content */}
                <div className={`accordion-grid-wrapper ${isVideosExpanded ? 'expanded' : ''}`}>
                  <div className="accordion-grid-content">
                    <ul className={`py-1 border-t border-b space-y-0.5 ${
                      themeMode === 'light' ? 'bg-slate-100/90 border-slate-200' : 'bg-black/40 border-white/10'
                    }`}>
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
                          className={`sidebar-interactive-pill w-full pl-12 pr-5 py-2.5 flex items-center gap-3 text-xs font-bold text-left transition-colors cursor-pointer ${
                            themeMode === 'light'
                              ? 'text-slate-800 hover:text-amber-600 hover:bg-slate-200'
                              : 'text-zinc-200 hover:text-amber-400 hover:bg-white/5'
                          }`}
                        >
                          <span className="material-symbols-outlined text-base text-amber-500">trophy</span>
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
                          className={`sidebar-interactive-pill w-full pl-12 pr-5 py-2.5 flex items-center gap-3 text-xs font-bold text-left transition-colors cursor-pointer ${
                            themeMode === 'light'
                              ? 'text-slate-800 hover:text-rose-600 hover:bg-slate-200'
                              : 'text-zinc-200 hover:text-rose-400 hover:bg-white/5'
                          }`}
                        >
                          <span className="material-symbols-outlined text-base text-rose-500">local_fire_department</span>
                          <span>Most Popular</span>
                        </button>
                      </li>
                    </ul>
                  </div>
                </div>
              </li>

              {/* All Categories Drill-Down Folder */}
              <li className="drawer-item-stagger">
                <button
                  type="button"
                  onClick={() => setDrawerSubView('categories')}
                  className={`sidebar-interactive-pill w-full px-5 py-3.5 flex items-center justify-between transition-colors cursor-pointer font-bold text-left group ${
                    themeMode === 'light'
                      ? 'text-slate-900 hover:text-[#06b6d4] hover:bg-slate-100 active:bg-slate-200'
                      : 'text-zinc-100 hover:text-white hover:bg-white/10 active:bg-white/15'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <span className="material-symbols-outlined text-xl text-[#06b6d4] group-hover:text-cyan-500 transition-colors">menu_book</span>
                    <span className={`text-sm font-bold ${themeMode === 'light' ? 'text-slate-900' : 'text-zinc-100'}`}>All categories</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-mono">
                    <span className={`font-bold px-2 py-0.5 rounded-md border ${
                      themeMode === 'light'
                        ? 'text-cyan-700 bg-cyan-50 border-cyan-200'
                        : 'text-cyan-400 bg-cyan-950/60 border-cyan-500/30'
                    }`}>({categories.length})</span>
                    <span className={`material-symbols-outlined text-sm ${themeMode === 'light' ? 'text-slate-400' : 'text-zinc-400'}`}>chevron_right</span>
                  </div>
                </button>
              </li>

              {/* Popular Categories */}
              <li className="drawer-item-stagger">
                <button
                  type="button"
                  onClick={() => {
                    onNavigate('categories');
                    onClose();
                  }}
                  className={`sidebar-interactive-pill w-full px-5 py-3.5 flex items-center gap-3.5 transition-colors cursor-pointer font-bold text-left ${
                    themeMode === 'light'
                      ? 'text-slate-900 hover:text-[#10b981] hover:bg-slate-100 active:bg-slate-200'
                      : 'text-zinc-100 hover:text-white hover:bg-white/10 active:bg-white/15'
                  }`}
                >
                  <span className="material-symbols-outlined text-xl text-[#10b981]">inventory_2</span>
                  <span className={`text-sm font-bold ${themeMode === 'light' ? 'text-slate-900' : 'text-zinc-100'}`}>Popular categories</span>
                </button>
              </li>

              {/* Pornstars / Performers */}
              <li className="drawer-item-stagger">
                <button
                  type="button"
                  onClick={handlePerformersClick}
                  className={`sidebar-interactive-pill w-full px-5 py-3.5 flex items-center gap-3.5 transition-colors cursor-pointer font-bold text-left ${
                    themeMode === 'light'
                      ? 'text-slate-900 hover:text-[#f43f5e] hover:bg-slate-100 active:bg-slate-200'
                      : 'text-zinc-100 hover:text-white hover:bg-white/10 active:bg-white/15'
                  }`}
                >
                  <span className="material-symbols-outlined text-xl text-[#f43f5e]">groups</span>
                  <span className={`text-sm font-bold ${themeMode === 'light' ? 'text-slate-900' : 'text-zinc-100'}`}>Pornstars</span>
                </button>
              </li>

              {/* Content Preference Filter (Straight / Gay / Lesbian) */}
              <li className={`drawer-item-stagger mobile-drawer-filter-section px-5 py-3.5 border-b space-y-2.5 ${
                themeMode === 'light' ? 'bg-slate-100 border-slate-200' : 'bg-black/20 border-white/10'
              }`}>
                <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider">
                  <span className={`flex items-center gap-1.5 font-bold ${
                    themeMode === 'light' ? 'text-slate-800' : 'text-zinc-300'
                  }`}>
                    <span className="material-symbols-outlined text-sm text-[#e0358d]">tune</span>
                    <span className="font-extrabold">Content Filter</span>
                  </span>
                  <span className={`font-mono text-[10px] uppercase font-black px-2 py-0.5 rounded border ${
                    themeMode === 'light'
                      ? 'text-pink-600 bg-pink-50 border-pink-200'
                      : 'text-[#ec4899] bg-pink-950/60 border-pink-500/30'
                  }`}>{contentPreference}</span>
                </div>
                <div className={`mobile-drawer-filter-box grid grid-cols-3 gap-1.5 p-1 rounded-xl border ${
                  themeMode === 'light'
                    ? 'bg-white border-slate-300 shadow-sm'
                    : 'bg-zinc-900 border-white/10 shadow-inner'
                }`}>
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
                        className={`mobile-drawer-filter-item py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                          isSelected
                            ? 'bg-gradient-to-r from-[#e0358d] to-[#ec4899] text-white shadow-md font-extrabold'
                            : themeMode === 'light'
                            ? 'mobile-drawer-unselected-item text-slate-800 hover:text-slate-950 hover:bg-slate-100 font-bold'
                            : 'mobile-drawer-unselected-item text-zinc-300 hover:text-white hover:bg-white/10'
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
              <li className="drawer-item-stagger">
                <button
                  type="button"
                  onClick={() => {
                    onNavigate('saved');
                    onClose();
                  }}
                  className={`sidebar-interactive-pill w-full px-5 py-3.5 flex items-center justify-between transition-colors cursor-pointer font-bold text-left ${
                    themeMode === 'light'
                      ? 'text-slate-900 hover:text-[#ec4899] hover:bg-slate-100 active:bg-slate-200'
                      : 'text-zinc-100 hover:text-white hover:bg-white/10 active:bg-white/15'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <span className="material-symbols-outlined text-xl text-[#ec4899]">bookmark</span>
                    <span className={`text-sm font-bold ${themeMode === 'light' ? 'text-slate-900' : 'text-zinc-100'}`}>Saved Videos</span>
                  </div>
                  {!userEmail && (
                    <span className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded border ${
                      themeMode === 'light'
                        ? 'bg-slate-200 text-slate-700 border-slate-300'
                        : 'bg-white/10 text-zinc-300 border-white/10'
                    }`}>
                      Sync
                    </span>
                  )}
                </button>
              </li>

              {/* User Account / Sign In / Sign Out */}
              {userEmail ? (
                <li className="drawer-item-stagger">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      if (onSignOut) onSignOut();
                    }}
                    className={`sidebar-interactive-pill w-full px-5 py-3.5 flex items-center justify-between transition-colors font-bold text-left cursor-pointer ${
                      themeMode === 'light'
                        ? 'text-rose-600 hover:bg-rose-50'
                        : 'text-rose-400 hover:bg-rose-500/15'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <span className="material-symbols-outlined text-xl text-rose-500">logout</span>
                      <span className={`text-sm font-bold ${themeMode === 'light' ? 'text-rose-600' : 'text-rose-300'}`}>Sign Out ({userEmail.split('@')[0]})</span>
                    </div>
                  </button>
                </li>
              ) : (
                <li className="drawer-item-stagger">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigate('signin');
                    }}
                    className={`sidebar-interactive-pill w-full px-5 py-3.5 flex items-center gap-3.5 transition-colors cursor-pointer font-bold text-left ${
                      themeMode === 'light'
                        ? 'text-slate-900 hover:text-emerald-600 hover:bg-slate-100'
                        : 'text-zinc-100 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <span className="material-symbols-outlined text-xl text-emerald-500">login</span>
                    <span className={`text-sm font-bold ${themeMode === 'light' ? 'text-slate-900' : 'text-zinc-100'}`}>Sign In / Create Account</span>
                  </button>
                </li>
              )}

              {/* Admin Panel Quick Link */}
              {onOpenAdminPanel && (
                <li className="drawer-item-stagger">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenAdminPanel();
                    }}
                    className={`sidebar-interactive-pill w-full px-5 py-3.5 flex items-center gap-3.5 transition-colors font-bold text-left ${
                      isAdminAuthenticated
                        ? themeMode === 'light'
                          ? 'text-emerald-700 bg-emerald-50'
                          : 'text-emerald-400 bg-emerald-500/10'
                        : themeMode === 'light'
                        ? 'text-slate-900 hover:text-blue-600 hover:bg-slate-100'
                        : 'text-zinc-200 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <span className="material-symbols-outlined text-xl text-blue-500">admin_panel_settings</span>
                    <span className={`text-sm font-bold ${themeMode === 'light' ? 'text-slate-900' : 'text-zinc-100'}`}>{isAdminAuthenticated ? 'Admin Console' : 'Support / Admin'}</span>
                  </button>
                </li>
              )}

              {/* Upload Video Button */}
              {onOpenUpload && (
                <li className="drawer-item-stagger p-4">
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
            /* ── VIEW 2: CATEGORIES FOLDER DRILL-DOWN (Direct Smooth Scrolling List) ─── */
            <ul className={`divide-y text-sm py-2 pb-28 ${
              themeMode === 'light' ? 'divide-slate-200 text-slate-900' : 'divide-white/5 text-white'
            }`}>
              {categories.map((cat) => {
                const count = categoryCountMap[cat.id] ?? 0;
                return (
                  <li key={cat.id} className="drawer-item-stagger">
                    <button
                      type="button"
                      onClick={() => handleCategoryClick(cat.id)}
                      className={`sidebar-interactive-pill w-full px-5 py-3.5 flex items-center justify-between transition-colors cursor-pointer text-left group ${
                        themeMode === 'light'
                          ? 'text-slate-900 hover:text-[#ec4899] hover:bg-slate-100 active:bg-slate-200'
                          : 'text-zinc-100 hover:text-[#ec4899] hover:bg-white/5 active:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-lg text-[#ec4899]">{cat.icon || 'category'}</span>
                        <span className={`font-bold text-xs capitalize group-hover:text-[#ec4899] transition-colors ${
                          themeMode === 'light' ? 'text-slate-900 font-bold' : 'text-zinc-100'
                        }`}>
                          {cat.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded border ${
                          themeMode === 'light'
                            ? 'text-slate-700 bg-slate-200 border-slate-300'
                            : 'text-zinc-400 bg-white/5 border-transparent'
                        }`}>
                          {count}
                        </span>
                        <span className="material-symbols-outlined text-xs text-zinc-400 group-hover:text-[#ec4899] transition-colors">chevron_right</span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
};
