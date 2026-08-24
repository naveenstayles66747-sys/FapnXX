import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ContentPreference, ScreenId, Video } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { LANGUAGE_LIST } from '../i18n/translations';
import { ThemeMode } from '../utils/storage';
import { getGroupedSearchSuggestions, GroupedSuggestions } from '../utils/searchEngine';
import { SearchSuggestionsDropdown } from './SearchSuggestionsDropdown';

interface HeaderProps {
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  isMobileDrawerOpen?: boolean;
  onToggleMobileDrawer: () => void;
  onOpenSearch: () => void;
  onOpenUpload?: () => void;
  onOpenAds?: () => void;
  onOpenAdminPanel?: () => void;
  isAdminAuthenticated?: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  userEmail?: string | null;
  onSignOut?: () => void;
  themeMode: ThemeMode;
  onToggleTheme: () => void;
  contentPreference: ContentPreference;
  onChangeContentPreference: (pref: ContentPreference) => void;
  videos?: Video[];
}

// Custom Dual-Color SVG Icon matching the interlinked Male + Female (Venus & Mars) heterosexual gender symbol
const IntertwinedGenderIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    strokeWidth="2.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Female (Venus ♀) Circle & Cross in Swatch Pink #e0358d */}
    <g>
      <circle cx="8.5" cy="12.5" r="4.2" className="stroke-[#e0358d] group-hover/gender:stroke-white transition-colors" />
      <line x1="8.5" y1="16.7" x2="8.5" y2="22" className="stroke-[#e0358d] group-hover/gender:stroke-white transition-colors" />
      <line x1="5.5" y1="19.5" x2="11.5" y2="19.5" className="stroke-[#e0358d] group-hover/gender:stroke-white transition-colors" />
    </g>

    {/* Male (Mars ♂) Circle & Arrow in Black / Theme Dark */}
    <g className="text-zinc-900 dark:text-zinc-100 stroke-current group-hover/gender:text-white transition-colors">
      <circle cx="14.5" cy="8.5" r="4.2" />
      <line x1="17.5" y1="5.5" x2="22" y2="1" />
      <polyline points="17 1 22 1 22 6" />
    </g>
  </svg>
);

// Globe SVG Icon for Language Switcher
const GlobeIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" stroke="currentColor" />
    <ellipse cx="12" cy="12" rx="4.2" ry="10" stroke="currentColor" />
    <line x1="2" y1="9" x2="22" y2="9" stroke="currentColor" />
    <line x1="2" y1="15" x2="22" y2="15" stroke="currentColor" />
  </svg>
);

export const Header: React.FC<HeaderProps> = ({
  currentScreen,
  onNavigate,
  isMobileDrawerOpen = false,
  onToggleMobileDrawer,
  onOpenSearch,
  onOpenUpload,
  onOpenAds,
  onOpenAdminPanel,
  isAdminAuthenticated = false,
  searchQuery,
  setSearchQuery,
  userEmail,
  onSignOut,
  themeMode,
  onToggleTheme,
  contentPreference,
  onChangeContentPreference,
  videos = [],
}) => {
  const { language, setLanguage, t, currentLanguageMeta } = useLanguage();
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [isPrefMenuOpen, setIsPrefMenuOpen] = useState(false);
  const [mobileSearchActive, setMobileSearchActive] = useState(false);
  const [mobileSearchInput, setMobileSearchInput] = useState('');
  const mobileSearchRef = React.useRef<HTMLInputElement>(null);
  const prefDropdownRef = useRef<HTMLDivElement>(null);
  const prefDropdownRefMobile = useRef<HTMLDivElement>(null);
  const langDropdownRef = useRef<HTMLDivElement>(null);
  const desktopSearchRef = useRef<HTMLDivElement>(null);

  // Search suggestions state
  const [desktopSuggestionsOpen, setDesktopSuggestionsOpen] = useState(false);
  const [mobileSuggestionsOpen, setMobileSuggestionsOpen] = useState(false);
  const [groupedSuggestions, setGroupedSuggestions] = useState<GroupedSuggestions>({
    performers: [],
    tags: [],
    categories: [],
    titles: [],
    totalCount: 0,
  });

  // Deferred search values to prevent keyboard typing lag
  const deferredSearchQuery = React.useDeferredValue(searchQuery);
  const deferredMobileSearchInput = React.useDeferredValue(mobileSearchInput);

  // Generate suggestions whenever query changes (deferred)
  useEffect(() => {
    if (deferredSearchQuery.trim().length >= 1 && videos.length > 0) {
      setGroupedSuggestions(getGroupedSearchSuggestions(videos, deferredSearchQuery));
    } else {
      setGroupedSuggestions({ performers: [], tags: [], categories: [], titles: [], totalCount: 0 });
    }
  }, [deferredSearchQuery, videos]);

  useEffect(() => {
    if (deferredMobileSearchInput.trim().length >= 1 && videos.length > 0) {
      setGroupedSuggestions(getGroupedSearchSuggestions(videos, deferredMobileSearchInput));
    } else if (!mobileSearchActive) {
      setGroupedSuggestions({ performers: [], tags: [], categories: [], titles: [], totalCount: 0 });
    }
  }, [deferredMobileSearchInput, videos, mobileSearchActive]);

  const handleSuggestionSelect = useCallback((text: string) => {
    setSearchQuery(text);
    setMobileSearchInput(text);
    setDesktopSuggestionsOpen(false);
    setMobileSuggestionsOpen(false);
    onOpenSearch();
  }, [setSearchQuery, onOpenSearch]);

  // Close dropdowns on outside click cleanly across desktop and mobile
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const clickedOutsidePrefDesktop = !prefDropdownRef.current || !prefDropdownRef.current.contains(target);
      const clickedOutsidePrefMobile = !prefDropdownRefMobile.current || !prefDropdownRefMobile.current.contains(target);

      if (clickedOutsidePrefDesktop && clickedOutsidePrefMobile) {
        setIsPrefMenuOpen(false);
      }
      if (langDropdownRef.current && !langDropdownRef.current.contains(target)) {
        setIsLangMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const renderPrefDropdownMenu = () => (
    <div
      className="dropdown-modal-menu absolute left-0 lg:left-auto lg:right-0 mt-2 w-48 rounded-2xl shadow-2xl py-2 z-50 text-xs animate-in fade-in zoom-in-95 duration-150 overflow-hidden overscroll-contain"
      style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
      onWheel={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
    >
      <div className="px-3.5 py-2 text-[10px] font-extrabold uppercase tracking-wider text-[#debec8] border-b border-white/10 mb-1 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-sm text-[#e0358d]">tune</span>
          Content Filter
        </span>
        <span className="text-[#e0358d] font-mono text-[9px] font-black">ACTIVE</span>
      </div>
      {([
        { id: 'straight', label: 'Straight', icon: 'wc' },
        { id: 'gay', label: 'Gay', icon: 'male' },
        { id: 'lesbian', label: 'Lesbian', icon: 'female' },
      ] as const).map((pref) => {
        const isSelected = contentPreference === pref.id;
        return (
          <button
            key={pref.id}
            onClick={() => {
              onChangeContentPreference(pref.id);
              setIsPrefMenuOpen(false);
            }}
            className={`w-full px-3.5 py-2.5 text-left flex items-center justify-between transition-all cursor-pointer ${
              isSelected ? 'active-option font-extrabold border-l-4 border-[#e0358d]' : 'font-semibold'
            }`}
          >
            <span className="flex items-center gap-2.5">
              {pref.id === 'straight' ? (
                <IntertwinedGenderIcon className="w-4.5 h-4.5" />
              ) : pref.id === 'lesbian' ? (
                <span className="material-symbols-outlined text-base text-[#e0358d]">female</span>
              ) : (
                <span className="material-symbols-outlined text-base text-zinc-900 dark:text-zinc-100">male</span>
              )}
              <span className="font-semibold text-xs tracking-wide">{pref.label}</span>
            </span>
            {isSelected && (
              <span className="material-symbols-outlined text-sm text-[#e0358d] fill-1">check_circle</span>
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <header className="sticky top-0 w-full z-50 header-container backdrop-blur-xl border-b border-zinc-200/80 dark:border-white/10 flex justify-between items-center px-3 md:px-8 h-16 md:h-20 shrink-0 box-border bg-white/95 dark:bg-[#09090b]/95">
      {/* 1. Left Section: Hamburger + Brand Logo (Desktop) / Gender Button (Mobile) */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0 z-20">
        {/* Hamburger Menu Button */}
        <button
          onClick={onToggleMobileDrawer}
          className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700/80 text-zinc-800 dark:text-zinc-100 flex items-center justify-center transition-colors cursor-pointer active:scale-95 shrink-0"
          aria-label={isMobileDrawerOpen ? "Close menu" : "Open menu"}
          title={isMobileDrawerOpen ? "Close menu" : "Open menu"}
        >
          <span className={`material-symbols-outlined text-xl ${isMobileDrawerOpen ? 'text-[#e0358d]' : ''}`}>
            {isMobileDrawerOpen ? 'close' : 'menu'}
          </span>
        </button>

        {/* Brand Logo (Visible on Left in Desktop Web View) */}
        <div
          onClick={() => onNavigate('browse')}
          className="hidden lg:flex items-center cursor-pointer select-none active:scale-95 transition-transform"
        >
          <h1 className="text-xl md:text-2xl font-black tracking-tight whitespace-nowrap">
            <span className="text-[#e0358d] drop-shadow-[0_0_12px_rgba(224,53,141,0.6)] font-black">Fap</span>
            <span className="brand-letter-n font-black">n</span>
            <span className="header-brand-nxx font-black">XX</span>
          </h1>
        </div>

        {/* Mobile Only: Gender Preference Filter Button */}
        <div className="relative shrink-0 lg:hidden" ref={prefDropdownRefMobile}>
          <button
            onClick={() => { setIsPrefMenuOpen(!isPrefMenuOpen); setIsLangMenuOpen(false); }}
            className="gender-btn-glow w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800/80 flex items-center justify-center cursor-pointer active:scale-95 shrink-0 shadow-sm border border-zinc-200/50 dark:border-white/10"
            title="Content Filter Preference"
            aria-label="Content Preference"
          >
            {contentPreference === 'straight' ? (
              <IntertwinedGenderIcon className="w-5 h-5" />
            ) : contentPreference === 'lesbian' ? (
              <span className="material-symbols-outlined text-xl text-[#e0358d]">female</span>
            ) : (
              <span className="material-symbols-outlined text-xl text-zinc-900 dark:text-zinc-100">male</span>
            )}
          </button>

          {isPrefMenuOpen && renderPrefDropdownMenu()}
        </div>
      </div>

      {/* 2. Mobile Center Logo (Only on Mobile screens < lg) */}
      <div className="lg:hidden absolute left-1/2 -translate-x-1/2 flex items-center justify-center z-10 pointer-events-auto">
        <h1
          onClick={() => onNavigate('browse')}
          className="text-lg sm:text-xl font-black tracking-tight cursor-pointer select-none active:scale-95 transition-transform whitespace-nowrap"
        >
          <span className="text-[#e0358d] drop-shadow-[0_0_12px_rgba(224,53,141,0.6)] font-black">Fap</span>
          <span className="brand-letter-n font-black">n</span>
          <span className="header-brand-nxx font-black">XX</span>
        </h1>
      </div>

      {/* 3. Desktop Centered Search Bar */}
      <div ref={desktopSearchRef} className="hidden lg:flex flex-1 max-w-xs xl:max-w-md mx-4 relative group/search min-w-0 z-20">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            onOpenSearch();
            setDesktopSuggestionsOpen(true);
          }}
          onFocus={() => { if (searchQuery.trim()) setDesktopSuggestionsOpen(true); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { onOpenSearch(); setDesktopSuggestionsOpen(false); }
            if (e.key === 'Escape') { setDesktopSuggestionsOpen(false); }
          }}
          placeholder="Search videos, performers, tags..."
          className="w-full header-search-input rounded-full py-2 pl-5 pr-10 text-xs focus:outline-none focus:ring-2 focus:ring-[#e0358d]/50 transition-all shadow-inner border"
          autoComplete="off"
        />
        <button
          onClick={() => { onOpenSearch(); setDesktopSuggestionsOpen(false); }}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full text-[#e0358d] hover:bg-[#e0358d]/20 transition-colors cursor-pointer"
          aria-label="Search"
        >
          <span className="material-symbols-outlined header-search-icon transition-colors text-lg text-[#e0358d]">
            search
          </span>
        </button>
        {/* Desktop Suggestions Dropdown */}
        <SearchSuggestionsDropdown
          groupedSuggestions={groupedSuggestions}
          query={searchQuery}
          onSelect={handleSuggestionSelect}
          onClose={() => setDesktopSuggestionsOpen(false)}
          visible={desktopSuggestionsOpen && groupedSuggestions.totalCount > 0}
        />
      </div>

      {/* 4. Right Action Buttons */}
      <div className="flex items-center gap-2 md:gap-2.5 shrink-0 z-20">
        {/* Desktop Theme Toggle Button (Light/Dark Mode) — Sleek Theme Matching Pill */}
        <button
          onClick={onToggleTheme}
          className="hidden lg:flex w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800/90 hover:bg-[#e0358d] dark:hover:bg-[#e0358d] text-zinc-700 dark:text-zinc-200 hover:text-white dark:hover:text-white items-center justify-center cursor-pointer active:scale-95 shrink-0 shadow-sm border border-zinc-300 dark:border-white/10 transition-all duration-200 group/theme"
          title={themeMode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle theme mode"
        >
          <span className="material-symbols-outlined text-[18px] text-[#e0358d] dark:text-[#f472b6] group-hover/theme:text-white transition-colors">
            {themeMode === 'dark' ? 'light_mode' : 'dark_mode'}
          </span>
        </button>

        {/* Desktop Content Preference Filter Dropdown */}
        <div className="relative hidden lg:block" ref={prefDropdownRef}>
          <button
            onClick={() => { setIsPrefMenuOpen(!isPrefMenuOpen); setIsLangMenuOpen(false); }}
            className="header-btn-hover-pink w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800/80 flex items-center justify-center cursor-pointer active:scale-95 shrink-0 shadow-sm border border-zinc-200/50 dark:border-white/10 group/gender"
            title="Content Filter Preference"
            aria-label="Content Preference"
          >
            {contentPreference === 'straight' ? (
              <IntertwinedGenderIcon className="w-5 h-5" />
            ) : contentPreference === 'lesbian' ? (
              <span className="material-symbols-outlined text-lg text-[#e0358d] group-hover/gender:text-white transition-colors">female</span>
            ) : (
              <span className="material-symbols-outlined text-lg text-zinc-900 dark:text-zinc-100 group-hover/gender:text-white transition-colors">male</span>
            )}
          </button>

          {isPrefMenuOpen && renderPrefDropdownMenu()}
        </div>

        {/* Admin Panel Access Button */}
        {onOpenAdminPanel && (
          <button
            onClick={onOpenAdminPanel}
            className={`hidden lg:flex px-2.5 py-1.5 rounded-lg font-bold text-[11px] tracking-wider uppercase border transition-all items-center gap-1 cursor-pointer active:scale-95 group/btn ${
              isAdminAuthenticated
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30 hover:text-white'
                : 'bg-[#2a2a2c] hover:bg-[#e0358d] text-[#ffb0cd] hover:text-white border-[#353437] hover:border-[#e0358d]'
            }`}
            title="Open Admin Panel & Media Controls"
          >
            <span className="material-symbols-outlined text-base group-hover/btn:text-white transition-colors">admin_panel_settings</span>
            <span className="hidden lg:inline group-hover/btn:text-white transition-colors">{isAdminAuthenticated ? 'Admin Portal' : t.admin}</span>
          </button>
        )}

        {/* Upload Button — Desktop only (mobile has it in drawer menu) */}
        <button
          onClick={onOpenUpload}
          className="hidden lg:flex w-auto px-4 py-2 rounded-xl bg-[#e0358d] hover:bg-[#c9287a] text-white font-black text-xs shadow-lg shadow-[#e0358d]/30 items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shrink-0"
          title="Upload Video"
        >
          <span className="material-symbols-outlined text-xl">upload</span>
          <span className="uppercase text-[11px] tracking-wider">{t.upload}</span>
        </button>

        {/* Mobile Search Toggle Icon Button */}
        <div className="lg:hidden flex items-center">
          <button
            onClick={() => {
              setMobileSearchActive(!mobileSearchActive);
              if (!mobileSearchActive) {
                setTimeout(() => mobileSearchRef.current?.focus(), 100);
              }
            }}
            className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800/80 flex items-center justify-center text-[#e0358d] hover:bg-[#e0358d] hover:text-white dark:text-[#f472b6] dark:hover:text-white transition-colors cursor-pointer active:scale-95 shrink-0 shadow-sm border border-zinc-200/50 dark:border-white/10"
            aria-label="Search"
            title="Search"
          >
            <span className="material-symbols-outlined text-[20px] text-[#e0358d] dark:text-[#f472b6]">
              {mobileSearchActive ? 'close' : 'search'}
            </span>
          </button>
        </div>

        {userEmail ? (
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#2a2a2c] border border-white/10 text-xs text-[#e5e1e4]">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="font-bold max-w-[120px] truncate">{userEmail.split('@')[0]}</span>
            </div>
            <button
              onClick={onSignOut}
              className="hidden sm:block px-3 py-2 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 font-bold text-xs uppercase hover:bg-rose-900/50 transition-colors cursor-pointer"
              title="Sign Out"
            >
              {t.signOut}
            </button>
          </div>
        ) : (
          <div className="hidden lg:flex items-center gap-2">
            <button
              onClick={() => onNavigate('signin')}
              className="px-4 py-2 rounded-lg bg-[#2a2a2c] hover:bg-[#ec4899] border border-[#353437] hover:border-[#ec4899] text-[#e5e1e4] hover:text-white font-semibold text-xs tracking-wider uppercase transition-colors cursor-pointer group/btn"
            >
              <span className="group-hover/btn:text-white transition-colors">{t.signIn}</span>
            </button>
          </div>
        )}

        {/* Language Switcher Dropdown (Half-size compact circular icon button at right corner) */}
        <div className="relative" ref={langDropdownRef}>
          <button
            onClick={() => { setIsLangMenuOpen(!isLangMenuOpen); setIsPrefMenuOpen(false); }}
            className="header-btn-hover-pink w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800/80 flex items-center justify-center cursor-pointer active:scale-95 shrink-0 shadow-sm border border-zinc-200/50 dark:border-white/10 group/lang"
            title={isLangMenuOpen ? "Close Language Menu" : `Switch Language: ${currentLanguageMeta?.englishName || 'English'} (${currentLanguageMeta?.label || 'EN'}) / भाषा बदलें`}
            aria-label={isLangMenuOpen ? "Close Language Menu" : "Switch Language"}
          >
            {isLangMenuOpen ? (
              <span className="material-symbols-outlined text-[18px] text-[#e0358d] group-hover/lang:text-white transition-colors">
                close
              </span>
            ) : (
              <GlobeIcon className="w-[18px] h-[18px] text-[#e0358d] group-hover/lang:text-white transition-colors stroke-current" />
            )}
          </button>

          {isLangMenuOpen && (
            <div
              className="dropdown-modal-menu absolute right-0 mt-2 w-56 rounded-2xl shadow-2xl py-2 z-50 text-xs max-h-80 overflow-y-auto custom-scrollbar border border-white/10 overscroll-contain"
              style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
              onWheel={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
            >
              <div className="px-3.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[#debec8] border-b border-white/10 mb-1 flex items-center justify-between">
                <span>Select Language</span>
                <span className="text-[#e0358d] text-[9px] font-mono">REGIONAL PICKS</span>
              </div>
              {LANGUAGE_LIST.map((item) => {
                const isSelected = language === item.code;
                return (
                  <button
                    key={item.code}
                    onClick={() => {
                      setLanguage(item.code);
                      setIsLangMenuOpen(false);
                    }}
                    className={`w-full px-3.5 py-2 text-left flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected ? 'active-option font-extrabold border-l-4 border-[#e0358d]' : 'hover:bg-white/10 font-semibold'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-base">{item.flag}</span>
                      <span className="font-bold">{item.label}</span>
                      <span className="text-[10px] opacity-60">({item.englishName})</span>
                    </span>
                    {isSelected && <span className="material-symbols-outlined text-sm text-[#e0358d]">check</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Dedicated Full-Width Sub-Header Search Row (Exact Reference UI: Input + [Search] Button) */}
      {mobileSearchActive && (
        <div className="lg:hidden absolute top-full left-0 right-0 w-full bg-white dark:bg-[#121113] border-b border-zinc-200 dark:border-white/10 p-2.5 shadow-xl z-50 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-stretch gap-2 relative">
            <input
              ref={mobileSearchRef}
              type="text"
              value={mobileSearchInput}
              autoFocus
              autoComplete="off"
              onChange={(e) => {
                setMobileSearchInput(e.target.value);
                setSearchQuery(e.target.value);
                setMobileSuggestionsOpen(true);
                if (e.target.value.trim()) onOpenSearch();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onOpenSearch();
                  setMobileSearchActive(false);
                  setMobileSuggestionsOpen(false);
                }
                if (e.key === 'Escape') {
                  setMobileSearchActive(false);
                  setMobileSuggestionsOpen(false);
                }
              }}
              placeholder="Search pornstars, tags..."
              className="flex-1 bg-zinc-100 dark:bg-[#1c1b1f] text-zinc-900 dark:text-white px-3.5 py-2 rounded-lg text-sm border border-zinc-300 dark:border-white/15 focus:outline-none focus:border-[#e0358d]"
            />
            <button
              onClick={() => {
                onOpenSearch();
                setMobileSearchActive(false);
                setMobileSuggestionsOpen(false);
              }}
              className="px-4 py-2 bg-[#e0358d] hover:bg-[#c9287a] text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shrink-0 transition-colors shadow-sm cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">search</span>
              <span>Search</span>
            </button>
          </div>

          {/* Grouped Suggestions Dropdown Attached directly under input */}
          <SearchSuggestionsDropdown
            groupedSuggestions={groupedSuggestions}
            query={mobileSearchInput}
            onSelect={(text) => {
              handleSuggestionSelect(text);
              setMobileSearchActive(false);
            }}
            onClose={() => setMobileSuggestionsOpen(false)}
            visible={mobileSuggestionsOpen && groupedSuggestions.totalCount > 0}
          />
        </div>
      )}
    </header>
  );
};
