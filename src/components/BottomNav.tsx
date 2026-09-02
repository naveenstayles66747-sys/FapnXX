import React, { useState, useEffect, useRef } from 'react';
import { ScreenId } from '../types';

interface BottomNavProps {
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentScreen, onNavigate }) => {
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);
  const scrollThreshold = 10;

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      const currentScrollY = window.scrollY || document.documentElement.scrollTop;

      if (!ticking) {
        window.requestAnimationFrame(() => {
          // Always stay visible when at the very top of the page (< 40px)
          if (currentScrollY <= 40) {
            setIsVisible(true);
          } else {
            const diff = currentScrollY - lastScrollY.current;
            if (Math.abs(diff) > scrollThreshold) {
              if (diff > 0) {
                // Scrolling down -> Smoothly slide down & hide
                setIsVisible(false);
              } else {
                // Scrolling up -> Smoothly slide up & show
                setIsVisible(true);
              }
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
      className={`lg:hidden fixed bottom-0 left-0 w-full z-50 bg-white/95 dark:bg-[#09090b]/95 backdrop-blur-md border-t border-zinc-200 dark:border-white/10 shadow-2xl flex justify-around items-center py-2.5 px-4 pb-safe transition-all duration-300 ease-in-out transform ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
      }`}
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
