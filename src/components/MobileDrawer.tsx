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
      {/* Overlay */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300"
      />

      {/* Drawer Content */}
      <aside className="mobile-drawer-aside absolute left-0 top-0 h-full w-72 bg-[#131315] border-r border-white/10 flex flex-col z-10 animate-in slide-in-from-left duration-300">
        <div className="p-6 flex justify-between items-center border-b border-white/5">
          <div
            onClick={() => {
              onNavigate('browse');
              onClose();
            }}
            className="text-2xl font-black italic cursor-pointer tracking-tight"
          >
            <span className="text-[#e0358d] drop-shadow-[0_0_10px_rgba(224,53,141,0.5)] font-black">Fap</span>
            <span className="brand-letter-n font-black">n</span>
            <span className="mobile-drawer-text font-black">XX</span>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/5 text-[#debec8] hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="flex flex-col px-3 gap-1">
            {/* Mobile Theme Switcher Toggle */}
            <li>
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

            {/* Mobile Content Preference Selector (Straight / Gay / Lesbian) */}
            <li className="my-1">
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
                className="w-full flex items-center gap-4 px-4 py-3 rounded-lg text-[#e5e1e4] hover:bg-white/5 transition-colors font-semibold text-sm"
              >
                <span className="material-symbols-outlined text-[#ffb0cd]">home</span>
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
                  className="w-full flex items-center gap-4 px-4 py-3 rounded-lg text-[#e5e1e4] hover:bg-white/5 transition-colors font-semibold text-sm"
                >
                  <span className="material-symbols-outlined text-[#ffb0cd]">
                    {cat.icon}
                  </span>
                  <span>{cat.name}</span>
                </button>
              </li>
            ))}

            <li className="pt-2 border-t border-white/5 mt-2">
              <button
                onClick={() => {
                  onNavigate('performers');
                  onClose();
                }}
                className="w-full flex items-center gap-4 px-4 py-3 rounded-lg text-[#e5e1e4] hover:bg-white/5 transition-colors font-semibold text-sm"
              >
                <span className="material-symbols-outlined text-[#ffb0cd]">groups</span>
                <span>Performers</span>
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
                className="w-full flex items-center gap-4 px-4 py-3 rounded-lg text-[#e5e1e4] hover:bg-white/5 transition-colors font-semibold text-sm"
              >
                <span className="material-symbols-outlined text-[#ec4899]">bookmark_add</span>
                <span>Saved Videos</span>
                {!userEmail && (
                  <span className="ml-auto text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-white/10 text-[#a19fa6]">
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
