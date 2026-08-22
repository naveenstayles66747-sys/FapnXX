import React from 'react';
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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Overlay with smooth backdrop fade */}
      <div
        onClick={onClose}
        className="mobile-drawer-backdrop-anim absolute inset-0 bg-black/75 backdrop-blur-sm cursor-pointer"
      />

      {/* Drawer Content with natural spring physics slide */}
      <aside className="mobile-drawer-aside mobile-drawer-anim absolute left-0 top-0 h-full w-72 max-w-[85vw] bg-[#131315] border-r border-white/10 flex flex-col z-10 shadow-[20px_0_50px_rgba(0,0,0,0.8)]">
        {/* Drawer Header matching Header height (h-16) and exact top-left hamburger button position */}
        <div className="h-16 px-3 flex items-center gap-3 border-b border-zinc-200/80 dark:border-white/10 shrink-0">
          {/* Close Button placed at the EXACT same position as the 3-line hamburger button */}
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700/80 text-zinc-800 dark:text-zinc-100 flex items-center justify-center transition-colors cursor-pointer active:scale-95 shrink-0"
            aria-label="Close menu"
            title="Close menu"
          >
            <span className="material-symbols-outlined text-xl text-[#e0358d]">close</span>
          </button>

          <div
            onClick={() => {
              onNavigate('browse');
              onClose();
            }}
            className="text-xl font-black italic cursor-pointer tracking-tight select-none"
          >
            <span className="text-[#e0358d] drop-shadow-[0_0_10px_rgba(224,53,141,0.5)] font-black">Fap</span>
            <span className="brand-letter-n font-black">n</span>
            <span className="mobile-drawer-text font-black">XX</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="flex flex-col px-3 gap-1">
            {/* Mobile Theme Switcher Toggle (Hidden in Web View drawer) */}
            <li className="lg:hidden">
              <button
                onClick={onToggleTheme}
                className="mobile-drawer-card w-full flex items-center justify-between px-4 py-3 rounded-xl text-[#e5e1e4] bg-[#27272a]/70 hover:bg-white/10 transition-all font-semibold text-sm border border-white/5 cursor-pointer shadow-sm active:scale-95"
              >
                <div className="flex items-center gap-3.5">
                  <span className="material-symbols-outlined text-[#ffb0cd]">
                    {themeMode === 'dark' ? 'light_mode' : 'dark_mode'}
                  </span>
                  <span className="mobile-drawer-text">{themeMode === 'dark' ? 'Daytime Light Mode' : 'Nighttime Dark Mode'}</span>
                </div>
                <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-[#ec4899]/20 text-[#ffb0cd] border border-[#ec4899]/30">
                  {themeMode}
                </span>
              </button>
            </li>

            {/* Mobile Content Preference Selector (Hidden in Web View drawer) */}
            <li className="my-1 lg:hidden">
              <div className="mobile-drawer-card p-3 rounded-xl bg-[#27272a]/70 border border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="mobile-drawer-text-sub text-[11px] font-bold text-[#debec8] uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-[#ffb0cd]">tune</span>
                    Content Preference
                  </span>
                  <span className="text-[10px] font-bold capitalize text-[#ffb0cd]">
                    {contentPreference}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['straight', 'gay', 'lesbian'] as ContentPreference[]).map((pref) => (
                    <button
                      key={pref}
                      onClick={() => onChangeContentPreference(pref)}
                      className={`py-2 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                        contentPreference === pref
                          ? 'bg-[#ec4899] text-white shadow-neon-pink'
                          : 'mobile-drawer-unselected-btn text-[#a19fa6] hover:text-white bg-black/40'
                      }`}
                    >
                      {pref}
                    </button>
                  ))}
                </div>
              </div>
            </li>
            {onOpenAdminPanel && (
              <li>
                <button
                  onClick={() => {
                    onClose();
                    onOpenAdminPanel();
                  }}
                  className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg font-bold text-sm cursor-pointer ${
                    isAdminAuthenticated
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-[#27272a] text-[#ffb0cd]'
                  }`}
                >
                  <span className="material-symbols-outlined">admin_panel_settings</span>
                  <span>{isAdminAuthenticated ? 'Admin Console' : 'Admin Portal'}</span>
                </button>
              </li>
            )}

            {onOpenUpload && (
              <li>
                <button
                  onClick={() => {
                    onClose();
                    onOpenUpload();
                  }}
                  className="w-full flex items-center gap-4 px-4 py-3 rounded-lg text-[#ec4899] bg-[#ec4899]/10 border border-[#ec4899]/30 font-bold text-sm cursor-pointer"
                >
                  <span className="material-symbols-outlined">upload</span>
                  <span>Upload Video</span>
                </button>
              </li>
            )}

            <li>
              <button
                onClick={() => {
                  onNavigate('browse');
                  onClose();
                }}
                className="w-full flex items-center gap-4 px-4 py-3 rounded-lg text-zinc-900 dark:text-[#e5e1e4] hover:bg-black/5 dark:hover:bg-white/5 transition-colors font-bold text-sm cursor-pointer"
              >
                <span className="material-symbols-outlined text-[#e0358d] dark:text-[#ffb0cd]">home</span>
                <span>Home</span>
              </button>
            </li>

            {categories.map((cat) => (
              <li key={cat.id}>
                <button
                  onClick={() => {
                    onSelectCategory(cat.id);
                    onClose();
                  }}
                  className="w-full flex items-center gap-4 px-4 py-3 rounded-lg text-zinc-900 dark:text-[#e5e1e4] hover:bg-black/5 dark:hover:bg-white/5 transition-colors font-bold text-sm cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[#e0358d] dark:text-[#ffb0cd]">
                    {cat.icon}
                  </span>
                  <span>{cat.name}</span>
                </button>
              </li>
            ))}

            <li className="pt-2 border-t border-zinc-200 dark:border-white/5 mt-2">
              <button
                onClick={() => {
                  onNavigate('performers');
                  onClose();
                }}
                className="w-full flex items-center gap-4 px-4 py-3 rounded-lg text-zinc-900 dark:text-[#e5e1e4] hover:bg-black/5 dark:hover:bg-white/5 transition-colors font-bold text-sm cursor-pointer"
              >
                <span className="material-symbols-outlined text-[#e0358d] dark:text-[#ffb0cd]">groups</span>
                <span>Pornstars</span>
              </button>
            </li>

            <li>
              <button
                onClick={() => {
                  if (!userEmail) {
                    onClose();
                    if (onOpenSoftLogin) onOpenSoftLogin('Cloud Bookmarks & Sync');
                  } else {
                    onNavigate('browse');
                    onClose();
                  }
                }}
                className="w-full flex items-center gap-4 px-4 py-3 rounded-lg text-zinc-900 dark:text-[#e5e1e4] hover:bg-black/5 dark:hover:bg-white/5 transition-colors font-bold text-sm cursor-pointer"
              >
                <span className="material-symbols-outlined text-[#ec4899]">bookmark_add</span>
                <span>Saved Videos</span>
                {!userEmail && (
                  <span className="ml-auto text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-zinc-200 dark:bg-white/10 text-zinc-700 dark:text-[#a19fa6]">
                    Sync
                  </span>
                )}
              </button>
            </li>
          </ul>
        </nav>

        <div className="p-6 border-t border-white/5 flex flex-col gap-3">
          {userEmail ? (
            <div className="flex flex-col gap-2">
              <div className="text-xs text-[#debec8] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span className="font-semibold truncate">{userEmail}</span>
              </div>
              <button
                onClick={() => {
                  onNavigate('signin');
                  onClose();
                }}
                className="w-full py-2.5 bg-[#27272a] text-[#debec8] font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-white/10 transition-colors"
              >
                Account Settings
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs text-[#a19fa6] px-1">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">person_outline</span>
                  Guest Mode Active
                </span>
                <span className="text-[10px] text-emerald-400 font-bold uppercase">Private</span>
              </div>
              <button
                onClick={() => {
                  onNavigate('signin');
                  onClose();
                }}
                className="w-full py-3 bg-[#ec4899] text-[#fafafa] font-bold text-xs uppercase tracking-wider rounded-xl active:scale-95 transition-transform shadow-neon-pink cursor-pointer flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">login</span>
                Sign In / Sync Account
              </button>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};
