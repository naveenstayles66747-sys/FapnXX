import React, { useState } from 'react';
import { setStoredAgeVerified } from '../utils/storage';

interface AgeGateModalProps {
  onConfirm: () => void;
  onDecline?: () => void;
}

export const AgeGateModal: React.FC<AgeGateModalProps> = ({ onConfirm, onDecline }) => {
  const [showExitWarning, setShowExitWarning] = useState(false);

  const handleEnter = () => {
    setStoredAgeVerified(true);
    onConfirm();
  };

  const handleLeave = () => {
    if (onDecline) {
      onDecline();
    } else {
      setShowExitWarning(true);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-[#050507]/95 backdrop-blur-xl overflow-y-auto flex items-center justify-center p-4 sm:p-6 min-h-screen">
      <div className="relative w-full max-w-lg bg-[#121115] border border-rose-500/30 rounded-3xl p-6 sm:p-8 shadow-[0_0_80px_rgba(244,63,94,0.25)] text-center my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        {/* Ambient Glow Gradient inside card */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-rose-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-pink-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* 18+ Shield Icon Badge */}
        <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-rose-600 to-pink-500 text-white shadow-[0_0_30px_rgba(244,63,94,0.5)] mb-4 border border-white/20">
          <span className="material-symbols-outlined text-3xl sm:text-4xl">verified_user</span>
        </div>

        {/* Brand Logo */}
        <h1 className="font-black text-3xl sm:text-4xl italic tracking-tight mb-1">
          <span className="text-rose-500 drop-shadow-[0_0_15px_rgba(244,63,94,0.6)]">Fap</span>
          <span className="text-pink-400">n</span>
          <span className="text-white">XX</span>
        </h1>
        <p className="text-xs uppercase font-extrabold tracking-widest text-rose-400 mb-5">
          Adult Entertainment Network • 18+ Only
        </p>

        {!showExitWarning ? (
          <>
            {/* Disclaimer & Advisory Points */}
            <div className="bg-black/50 border border-white/10 rounded-2xl p-4 text-left space-y-2.5 mb-6">
              <div className="flex items-start gap-2.5">
                <span className="material-symbols-outlined text-rose-400 text-lg shrink-0 mt-0.5">warning</span>
                <p className="text-xs text-zinc-200 leading-relaxed font-medium">
                  This website contains <strong className="text-white font-bold">age-restricted adult content</strong> including sexually explicit scenes, audio, and materials.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="material-symbols-outlined text-emerald-400 text-lg shrink-0 mt-0.5">check_circle</span>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  By clicking <strong className="text-rose-400 font-bold">"I am 18 or Older"</strong>, you confirm under penalty of perjury that you are of legal age in your jurisdiction.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="material-symbols-outlined text-blue-400 text-lg shrink-0 mt-0.5">lock</span>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  100% Anonymous & Secure browsing with end-to-end device privacy.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={handleEnter}
                className="w-full py-3.5 px-6 bg-gradient-to-r from-rose-600 via-pink-600 to-rose-600 hover:from-rose-500 hover:to-pink-500 text-white font-extrabold text-sm uppercase tracking-wider rounded-xl shadow-[0_0_25px_rgba(244,63,94,0.4)] hover:shadow-[0_0_35px_rgba(244,63,94,0.6)] transition-all cursor-pointer active:scale-98 flex items-center justify-center gap-2 border border-white/20"
              >
                <span className="material-symbols-outlined text-lg">check</span>
                <span>I Am 18 or Older — Enter</span>
              </button>

              <button
                type="button"
                onClick={handleLeave}
                className="w-full py-3 px-6 bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 hover:border-white/20 text-zinc-300 hover:text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer active:scale-98 flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-base">arrow_back</span>
                <span>I Am Under 18 — Exit</span>
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Exit Warning Screen */}
            <div className="bg-black/60 border border-rose-500/30 rounded-2xl p-5 mb-6 text-center space-y-3">
              <span className="material-symbols-outlined text-4xl text-rose-500 animate-bounce">block</span>
              <h3 className="text-base font-black text-white">Access Restricted</h3>
              <p className="text-xs text-zinc-300 leading-relaxed">
                You must be at least 18 years of age to access FapnXX. If you reached this page by mistake, you can return or exit to a safe page.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setShowExitWarning(false)}
                className="w-full py-3.5 px-6 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-base">refresh</span>
                <span>Back to Verification</span>
              </button>

              <a
                href="https://www.google.com"
                className="w-full py-3 px-6 bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all text-center flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-base">exit_to_app</span>
                <span>Exit to Google</span>
              </a>
            </div>
          </>
        )}

        {/* Legal & Compliance Footer */}
        <div className="mt-6 pt-4 border-t border-white/10 text-[10px] text-zinc-400 space-y-1">
          <p className="font-semibold text-zinc-300">
            RTA (Restricted To Adults) • 18 U.S.C. 2257 Record-Keeping Compliance
          </p>
          <p>
            Parental control software is recommended to block minors from accessing adult content.
          </p>
        </div>
      </div>
    </div>
  );
};
