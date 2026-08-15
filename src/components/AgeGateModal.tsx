import React, { useState } from 'react';
import { setStoredAgeVerified } from '../utils/storage';

interface AgeGateModalProps {
  onConfirm: () => void;
  onDecline: () => void;
}

export const AgeGateModal: React.FC<AgeGateModalProps> = ({ onConfirm, onDecline }) => {
  const [showExitWarning, setShowExitWarning] = useState(false);

  const handleEnter = () => {
    setStoredAgeVerified(true);
    onConfirm();
  };

  const handleLeave = () => {
    setShowExitWarning(true);
  };

  return (
    <div className="age-gate-overlay fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4">
      <div className="age-gate-card glass-panel p-8 md:p-12 rounded-2xl max-w-md w-full text-center border-t border-white/10 shadow-[0_0_50px_rgba(247,81,161,0.15)] relative overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        <h1 className="font-extrabold text-3xl md:text-4xl italic mb-2 tracking-tighter">
          <span className="text-[#e0358d] drop-shadow-[0_0_10px_rgba(224,53,141,0.5)] font-black">Fap</span>
          <span className="brand-letter-n font-black">n</span>
          <span className="text-white font-black">XX</span>
        </h1>
        <h2 className="text-2xl md:text-3xl font-bold text-[#e5e1e4] mb-6">
          18+ Only
        </h2>

        {!showExitWarning ? (
          <>
            <p className="text-base text-[#debec8] mb-8 leading-relaxed">
              This website contains adult material and is only suitable for those 18 years or older.
              Click Enter only if you are at least 18 years of age.
            </p>

            <div className="flex flex-col gap-4">
              <button
                onClick={handleEnter}
                className="w-full bg-[#ec4899] text-[#fafafa] font-semibold text-xs tracking-wider uppercase py-4 rounded-lg hover:bg-[#f751a1] transition-all shadow-neon-pink cursor-pointer active:scale-[0.98]"
              >
                Enter Website
              </button>
              <button
                onClick={handleLeave}
                className="w-full bg-transparent border border-[#27272a] text-[#fafafa] font-semibold text-xs tracking-wider uppercase py-4 rounded-lg hover:bg-white/5 transition-colors cursor-pointer active:scale-[0.98]"
              >
                Leave
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-base text-[#debec8] mb-8 leading-relaxed">
              You must be 18 years or older to access FapnXX. You can return whenever you are ready.
            </p>
            <div className="flex flex-col gap-4">
              <button
                onClick={() => setShowExitWarning(false)}
                className="w-full bg-[#ec4899] text-[#fafafa] font-semibold text-xs tracking-wider uppercase py-4 rounded-lg hover:bg-[#f751a1] transition-all cursor-pointer"
              >
                Back to Age Gate
              </button>
              <a
                href="https://www.google.com"
                className="w-full block text-center bg-transparent border border-[#27272a] text-[#debec8] font-semibold text-xs tracking-wider uppercase py-4 rounded-lg hover:bg-white/5 transition-colors"
              >
                Exit to Google
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
