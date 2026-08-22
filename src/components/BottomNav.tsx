import React from 'react';
import { ScreenId } from '../types';

interface BottomNavProps {
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentScreen, onNavigate }) => {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 w-full z-50 bg-white/95 dark:bg-[#09090b]/95 backdrop-blur-md border-t border-zinc-200 dark:border-white/10 shadow-2xl flex justify-around items-center py-2.5 px-4 pb-safe transition-colors">
      <button
        onClick={() => onNavigate('browse')}
        className={`flex flex-col items-center justify-center cursor-pointer active:scale-90 transition-all ${
          currentScreen === 'browse' ? 'text-[#ec4899] dark:text-[#ffb0cd]' : 'text-zinc-500 dark:text-[#debec8] hover:text-[#ec4899] dark:hover:text-[#ffb0cd]'
        }`}
      >
        <span
          className="material-symbols-outlined text-2xl mb-0.5"
          style={{ fontVariationSettings: currentScreen === 'browse' ? "'FILL' 1" : "'FILL' 0" }}
        >
          explore
        </span>
        <span className="text-[11px] font-semibold tracking-wide">Browse</span>
      </button>

      <button
        onClick={() => onNavigate('categories')}
        className={`flex flex-col items-center justify-center cursor-pointer active:scale-90 transition-all ${
          currentScreen === 'categories' || currentScreen === 'category-detail'
            ? 'text-[#ec4899] dark:text-[#ffb0cd]'
            : 'text-zinc-500 dark:text-[#debec8] hover:text-[#ec4899] dark:hover:text-[#ffb0cd]'
        }`}
      >
        <span
          className="material-symbols-outlined text-2xl mb-0.5"
          style={{ fontVariationSettings: currentScreen === 'categories' || currentScreen === 'category-detail' ? "'FILL' 1" : "'FILL' 0" }}
        >
          grid_view
        </span>
        <span className="text-[11px] font-semibold tracking-wide">Categories</span>
      </button>

      <button
        onClick={() => onNavigate('performers')}
        className={`flex flex-col items-center justify-center cursor-pointer active:scale-90 transition-all ${
          currentScreen === 'performers' ? 'text-[#ec4899] dark:text-[#ffb0cd]' : 'text-zinc-500 dark:text-[#debec8] hover:text-[#ec4899] dark:hover:text-[#ffb0cd]'
        }`}
      >
        <span
          className="material-symbols-outlined text-2xl mb-0.5"
          style={{ fontVariationSettings: currentScreen === 'performers' ? "'FILL' 1" : "'FILL' 0" }}
        >
          groups
        </span>
        <span className="text-[11px] font-semibold tracking-wide">Pornstars</span>
      </button>

      <button
        onClick={() => onNavigate('signin')}
        className={`flex flex-col items-center justify-center cursor-pointer active:scale-90 transition-all ${
          currentScreen === 'signin' ? 'text-[#ec4899] dark:text-[#ffb0cd]' : 'text-zinc-500 dark:text-[#debec8] hover:text-[#ec4899] dark:hover:text-[#ffb0cd]'
        }`}
      >
        <span
          className="material-symbols-outlined text-2xl mb-0.5"
          style={{ fontVariationSettings: currentScreen === 'signin' ? "'FILL' 1" : "'FILL' 0" }}
        >
          account_circle
        </span>
        <span className="text-[11px] font-semibold tracking-wide">Profile</span>
      </button>
    </nav>
  );
};
