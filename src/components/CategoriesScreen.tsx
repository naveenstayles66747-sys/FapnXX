import React from 'react';
import { CategoryId, CategoryInfo, ScreenId } from '../types';
import { CATEGORIES } from '../data';
import { getCategoryHeroImage, handleCategoryImageError } from '../utils/mediaHelper';

interface CategoriesScreenProps {
  onSelectCategory: (id: CategoryId) => void;
  onNavigate: (screen: ScreenId) => void;
  categories?: CategoryInfo[];
}

export const CategoriesScreen: React.FC<CategoriesScreenProps> = ({
  onSelectCategory,
  onNavigate,
  categories = CATEGORIES,
}) => {
  return (
    <main className="w-full bg-zinc-50 dark:bg-[#09090b] p-4 sm:p-6 md:p-12 pb-8 lg:ml-64 transition-colors">
      <div className="mb-8">
        <h2 className="text-3xl font-extrabold text-zinc-900 dark:text-[#e5e1e4] mb-2 tracking-tight">Explore Categories</h2>
        <p className="text-base text-zinc-600 dark:text-[#debec8]">
          Curated themes, genres, and exclusive channels tailored for high-end viewing.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {categories.map((cat) => (
          <div
            key={cat.id}
            onClick={() => {
              onSelectCategory(cat.id);
            }}
            className="category-card-item group relative aspect-video sm:aspect-[16/10] lg:aspect-video w-full rounded-2xl overflow-hidden border border-zinc-200 dark:border-[#27272a] hover:border-[#ffb0cd] transition-all duration-300 cursor-pointer shadow-lg bg-[#09090b] select-none"
            style={{ contentVisibility: 'auto' }}
          >
            <img
              src={getCategoryHeroImage(cat)}
              alt={cat.name}
              loading="lazy"
              decoding="async"
              onError={(e) => handleCategoryImageError(e, cat.id)}
              className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/50 to-transparent" />

            <div className="absolute inset-0 p-4 sm:p-6 flex flex-col justify-between z-10">
              <div className="flex justify-end">
                <span className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-[#ffb0cd] shadow-md">
                  <span className="material-symbols-outlined text-lg sm:text-xl">{cat.icon}</span>
                </span>
              </div>

              <div>
                <h3 className="category-card-title text-xl sm:text-2xl font-black !text-white mb-1 group-hover:text-[#ffb0cd] transition-colors drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]">
                  {cat.name}
                </h3>
                <p className="category-card-desc text-xs !text-zinc-200 line-clamp-2 leading-relaxed drop-shadow-[0_1px_6px_rgba(0,0,0,0.9)] font-medium">
                  {cat.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
};
