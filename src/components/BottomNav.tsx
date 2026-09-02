import React, { useState, useEffect, useRef } from 'react';
import { ScreenId } from '../types';

interface BottomNavProps {
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentScreen, onNavigate }) => {
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);
  const accumulatedDelta = useRef(0);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      const currentScrollY = window.scrollY || document.documentElement.scrollTop;

      if (!ticking) {
        window.requestAnimationFrame(() => {
          // Always stay visible when at or near the top (< 45px)
          if (currentScrollY <= 45) {
            setIsVisible(true);
            accumulatedDelta.current = 0;
          } else {
            const diff = currentScrollY - lastScrollY.current;

            // Reset accumulation if scrolling direction flipped
            if ((diff > 0 && accumulatedDelta.current < 0) || (diff < 0 && accumulatedDelta.current > 0)) {
              accumulatedDelta.current = 0;
            }

            accumulatedDelta.current += diff;

            // Require 35px of intentional downward scroll before sliding down
            if (accumulatedDelta.current > 35) {
              setIsVisible(false);
            }
            // Require 18px of upward scroll to slide back up
            else if (accumulatedDelta.current < -18) {
              setIsVisible(true);
            }
          }

          lastScrollY.current = Math.max(0, currentScrollY);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      className={`lg:hidden fixed bottom-0 left-0 w-full z-50 bg-white/95 dark:bg-[#09090b]/95 backdrop-blur-md border-t border-zinc-200 dark:border-white/10 shadow-2xl flex justify-around items-center py-2.5 px-4 pb-safe transition-transform duration-300 will-change-transform ${
        isVisible ? 'translate-y-0' : 'translate-y-[115%] pointer-events-none'
      }`}
      style={{
        transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        transitionDuration: '380ms',
      }}
    >
      <button
        onClick={() => onNavigate('browse')}
        className={`flex flex-col items-center justify-center cursor-pointer active:scale-90 transition-all ${
          currentScreen === 'browse'
            ? 'text-[#e0358d] dark:text-[#ffb0cd] font-bold'
            : 'text-zinc-800 dark:text-zinc-400 hover:text-[#e0358d] dark:hover:text-[#ffb0cd]'
        }`}
      >
        <span
          className="material-symbols-outlined text-2xl mb-0.5"
          style={{ fontVariationSettings: currentScreen === 'browse' ? "'FILL' 1" : "'FILL' 0" }}
        >
          explore
        </span>
        <span className="text-[11px] font-bold tracking-wide">Browse</span>
      </button>

      <button
        onClick={() => onNavigate('categories')}
        className={`flex flex-col items-center justify-center cursor-pointer active:scale-90 transition-all ${
          currentScreen === 'categories' || currentScreen === 'category-detail'
            ? 'text-[#e0358d] dark:text-[#ffb0cd] font-bold'
            : 'text-zinc-800 dark:text-zinc-400 hover:text-[#e0358d] dark:hover:text-[#ffb0cd]'
        }`}
      >
        <span
          className="material-symbols-outlined text-2xl mb-0.5"
          style={{ fontVariationSettings: currentScreen === 'categories' || currentScreen === 'category-detail' ? "'FILL' 1" : "'FILL' 0" }}
        >
          grid_view
        </span>
        <span className="text-[11px] font-bold tracking-wide">Categories</span>
      </button>

      <button
        onClick={() => onNavigate('performers')}
        className={`flex flex-col items-center justify-center cursor-pointer active:scale-90 transition-all ${
          currentScreen === 'performers'
            ? 'text-[#e0358d] dark:text-[#ffb0cd] font-bold'
            : 'text-zinc-800 dark:text-zinc-400 hover:text-[#e0358d] dark:hover:text-[#ffb0cd]'
        }`}
      >
        <span
          className="material-symbols-outlined text-2xl mb-0.5"
          style={{ fontVariationSettings: currentScreen === 'performers' ? "'FILL' 1" : "'FILL' 0" }}
        >
          groups
        </span>
        <span className="text-[11px] font-bold tracking-wide">Pornstars</span>
      </button>

      <button
        onClick={() => onNavigate('signin')}
        className={`flex flex-col items-center justify-center cursor-pointer active:scale-90 transition-all ${
          currentScreen === 'signin'
            ? 'text-[#e0358d] dark:text-[#ffb0cd] font-bold'
            : 'text-zinc-800 dark:text-zinc-400 hover:text-[#e0358d] dark:hover:text-[#ffb0cd]'
        }`}
      >
        <span
          className="material-symbols-outlined text-2xl mb-0.5"
          style={{ fontVariationSettings: currentScreen === 'signin' ? "'FILL' 1" : "'FILL' 0" }}
        >
          account_circle
        </span>
        <span className="text-[11px] font-bold tracking-wide">Profile</span>
      </button>
    </nav>
  );
};
