import React from 'react';
import { useLanguage } from '../i18n/LanguageContext';

interface SoftLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignIn: () => void;
  featureName?: string;
}

export const SoftLoginModal: React.FC<SoftLoginModalProps> = ({
  isOpen,
  onClose,
  onSignIn,
  featureName = 'Personal Account Features',
}) => {
  const { t } = useLanguage();

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="glass-panel p-6 md:p-8 rounded-3xl max-w-md w-full border border-white/10 shadow-[0_0_50px_rgba(236,72,153,0.15)] relative overflow-hidden space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-[#a19fa6] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-xl">close</span>
        </button>

        {/* Header Icon */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#ec4899]/20 text-[#ffb0cd] flex items-center justify-center border border-[#ec4899]/30">
            <span className="material-symbols-outlined text-2xl">sync_lock</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-extrabold tracking-widest text-[#ffb0cd] bg-[#ec4899]/10 px-2.5 py-1 rounded-full border border-[#ec4899]/20">
              Optional Account Sync
            </span>
            <h2 className="text-xl font-bold text-white mt-1">
              Unlock {featureName}
            </h2>
          </div>
        </div>

        {/* Message */}
        <p className="text-sm text-[#debec8] leading-relaxed">
          You are currently browsing seamlessly in <strong className="text-white">Guest Mode</strong>.
          Sign in or create a free account to sync your bookmarks, watch history, and custom playlists across all devices.
        </p>

        {/* Benefits list */}
        <div className="space-y-2.5 bg-[#141316] p-4 rounded-2xl border border-white/5 text-xs text-[#e5e1e4]">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-emerald-400 text-base">cloud_done</span>
            <span>Cloud Bookmarks & Favorites Sync</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-emerald-400 text-base">history</span>
            <span>Cross-Device Watch History Sync</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-emerald-400 text-base">playlist_add_check</span>
            <span>Custom Playlist Creation</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 pt-2">
          <button
            onClick={() => {
              onClose();
              onSignIn();
            }}
            className="w-full py-3.5 px-5 rounded-2xl bg-[#ec4899] hover:bg-[#f751a1] text-white font-bold text-xs uppercase tracking-wider shadow-neon-pink transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <span className="material-symbols-outlined text-lg">login</span>
            Sign In / Create Account
          </button>

          <button
            onClick={onClose}
            className="w-full py-3 px-5 rounded-2xl bg-[#2a2a2c] hover:bg-[#353437] text-[#debec8] font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">no_accounts</span>
            Continue Browsing as Guest
          </button>
        </div>
      </div>
    </div>
  );
};
