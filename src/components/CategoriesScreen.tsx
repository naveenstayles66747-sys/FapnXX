import React from 'react';
import { CategoryId, CategoryInfo, ScreenId } from '../types';
import { CATEGORIES } from '../data';

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
    <main className="flex-1 overflow-y-auto bg-[#09090b] p-6 md:p-12 pb-32 lg:ml-64">
      <div className="mb-8">
        <h2 className="text-3xl font-extrabold text-[#e5e1e4] mb-2">Explore Categories</h2>
        <p className="text-base text-[#debec8]">
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
            className="group relative h-64 rounded-2xl overflow-hidden border border-[#27272a] hover:border-[#ffb0cd] transition-all duration-300 cursor-pointer shadow-lg"
          >
            <img
              src={cat.heroImage}
              alt={cat.name}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/40 to-transparent" />

            <div className="absolute inset-0 p-6 flex flex-col justify-between">
              <div className="flex justify-end">
                <span className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-[#ffb0cd]">
                  <span className="material-symbols-outlined">{cat.icon}</span>
                </span>
              </div>

              <div>
                <h3 className="text-2xl font-bold text-white mb-1 group-hover:text-[#ffb0cd] transition-colors">
                  {cat.name}
                </h3>
                <p className="text-xs text-[#debec8] line-clamp-2 leading-relaxed">
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
