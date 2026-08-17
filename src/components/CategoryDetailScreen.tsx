import React from 'react';
import { CategoryId, CategoryInfo, Video } from '../types';
import { CATEGORIES, VIDEOS } from '../data';
import { VideoCard } from './VideoCard';
import { OutstreamVideoCardAd } from './AdSpaces';
import { getCategoryHeroImage, handleCategoryImageError } from '../utils/mediaHelper';

interface CategoryDetailScreenProps {
  categoryId: CategoryId;
  onSelectVideo: (video: Video) => void;
  onSelectSubtag?: (tag: string) => void;
  videos?: Video[];
  categories?: CategoryInfo[];
  userEmail?: string | null;
}

export const CategoryDetailScreen: React.FC<CategoryDetailScreenProps> = ({
  categoryId,
  onSelectVideo,
  videos = VIDEOS,
  categories = CATEGORIES,
  userEmail,
}) => {
  const category = categories.find((c) => c.id === categoryId) || categories[0] || CATEGORIES[0];
  const activeVideos = React.useMemo(() => (videos || []).filter((v) => !v.isTakenDown), [videos]);
  const categoryVideos = React.useMemo(() => {
    return activeVideos.filter((v) => v.category === categoryId || categoryId === 'trending');
  }, [activeVideos, categoryId]);

  const [selectedSubtag, setSelectedSubtag] = React.useState<string>('All');
  const [sortBy, setSortBy] = React.useState<'newest' | 'views'>('newest');
  const [isSavedCategory, setIsSavedCategory] = React.useState<boolean>(false);
  const [toastMsg, setToastMsg] = React.useState<string | null>(null);

  const handleToggleMyList = () => {
    setIsSavedCategory(!isSavedCategory);
    setToastMsg(!isSavedCategory ? `Saved ${category.name} to My List` : `Removed ${category.name} from My List`);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleSelectSubtag = (tag: string) => {
    React.startTransition(() => {
      setSelectedSubtag(tag);
    });
  };

  const handleToggleSort = () => {
    React.startTransition(() => {
      setSortBy((prev) => (prev === 'newest' ? 'views' : 'newest'));
    });
  };

  // Subtags filter & sorting logic
  const filteredCategoryVideos = React.useMemo(() => {
    const list = categoryVideos.filter((v) => {
      if (selectedSubtag === 'All') return true;
      const lowerSubtag = selectedSubtag.toLowerCase();
      return (
        v.tags.some((t) => t.toLowerCase().includes(lowerSubtag)) ||
        v.title.toLowerCase().includes(lowerSubtag) ||
        v.description.toLowerCase().includes(lowerSubtag)
      );
    });

    if (sortBy === 'views') {
      const getNum = (v: Video) => {
        if (typeof v.viewsCount === 'number' && !isNaN(v.viewsCount)) return v.viewsCount;
        const str = (v.views || '').toUpperCase();
        if (str.includes('M')) return parseFloat(str) * 1_000_000;
        if (str.includes('K')) return parseFloat(str) * 1_000;
        return parseInt(str.replace(/[^0-9]/g, ''), 10) || 0;
      };
      list.sort((a, b) => getNum(b) - getNum(a));
    } else {
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    }

    return list;
  }, [categoryVideos, selectedSubtag, sortBy]);

  const subtags = ['All', 'Exclusive', 'POV', '4K', 'Romance', 'Sensual'];

  return (
    <main className="w-full lg:ml-64 flex-1 pb-28">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-24 right-6 z-50 flex items-center gap-2 bg-[#ec4899] text-white px-5 py-3 rounded-2xl shadow-2xl font-bold text-xs">
          <span className="material-symbols-outlined text-[#fafafa]">bookmark</span>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Hero Header Banner Section */}
      <section className="hero-banner-container relative h-[360px] md:h-[450px] w-full flex items-end p-6 md:p-12 overflow-hidden border-b border-[#353437]">
        <div className="absolute inset-0 bg-gradient-to-t from-[#131315] via-[#131315]/70 to-transparent z-10" />
        <div className="absolute inset-0 z-0">
          <img
            src={getCategoryHeroImage(category)}
            alt={category.name}
            loading="lazy"
            decoding="async"
            onError={(e) => handleCategoryImageError(e, category.id)}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="relative z-20 max-w-7xl w-full">
          <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-3 tracking-tight">
            {category.name}
          </h1>
          <p className="text-base md:text-lg text-[#debec8] max-w-2xl leading-relaxed">
            {category.description}
          </p>

          {/* MY LIST Button (Rendered ONLY when user is logged in / signed up) */}
          {userEmail && (
            <div className="pt-5 flex flex-wrap gap-4">
              <button
                onClick={handleToggleMyList}
                className={`border font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-full transition-colors flex items-center space-x-2 cursor-pointer active:scale-95 ${
                  isSavedCategory
                    ? 'bg-[#ec4899] text-white border-[#ec4899]'
                    : 'bg-transparent border-[#574048] text-[#fafafa] hover:bg-white/10'
                }`}
              >
                <span
                  className="material-symbols-outlined text-lg"
                  style={{ fontVariationSettings: isSavedCategory ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {isSavedCategory ? 'check' : 'add'}
                </span>
                <span>{isSavedCategory ? 'SAVED TO MY LIST' : 'MY LIST'}</span>
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Subtags / Filter Navigation Chips */}
      <section className="px-6 md:px-12 py-5 border-b border-[#353437] bg-[#1c1b1d]/50">
        <div className="flex overflow-x-auto hide-scrollbar space-x-3 pb-1">
          {subtags.map((tag) => (
            <button
              key={tag}
              onClick={() => handleSelectSubtag(tag)}
              className={`whitespace-nowrap px-4 py-2 rounded-full font-semibold text-xs transition-colors cursor-pointer active:scale-95 ${
                selectedSubtag === tag
                  ? 'bg-[#ec4899] text-[#fafafa] shadow-neon-pink'
                  : 'bg-[#2a2a2c] text-[#e5e1e4] hover:bg-[#353437]'
              }`}
            >
              {tag === 'All' ? `All ${category.name}` : tag}
            </button>
          ))}
        </div>
      </section>

      {/* Content Collection Header */}
      <section className="max-w-7xl mx-auto p-6 md:p-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-[#e5e1e4]">
            {selectedSubtag === 'All' ? 'Latest Uploads' : `${selectedSubtag} Selection`}
          </h2>
          <div className="flex gap-4">
            <button
              onClick={handleToggleSort}
              className="px-4 py-2 bg-[#201f22] hover:bg-[#ec4899] border border-[#353437] hover:border-[#ec4899] rounded-full text-xs font-bold transition-all flex items-center gap-2 cursor-pointer active:scale-95 shadow-sm group/sort"
            >
              <span className="material-symbols-outlined text-sm text-[#ffb0cd] group-hover/sort:text-white transition-colors">swap_vert</span>
              <span className="text-[#e5e1e4] group-hover/sort:text-white transition-colors">
                Sorted by: <span className="font-extrabold">{sortBy === 'newest' ? 'Newest' : 'Most Viewed'}</span>
              </span>
            </button>
          </div>
        </div>

        {/* Video Card Layout */}
        {filteredCategoryVideos.length > 0 ? (
          categoryId === 'pov' ? (
            <div className="flex flex-col gap-6">
              {filteredCategoryVideos.map((video) => (
                <VideoCard
                  key={video.id}
                  video={video}
                  onClick={() => onSelectVideo(video)}
                  layout="horizontal"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {filteredCategoryVideos.map((video, idx) => (
                <React.Fragment key={video.id}>
                  <VideoCard
                    video={video}
                    onClick={() => onSelectVideo(video)}
                    layout="grid"
                  />
                  {idx === 3 && (
                    <OutstreamVideoCardAd key="category-outstream-ad" />
                  )}
                </React.Fragment>
              ))}
            </div>
          )
        ) : (
          <div className="p-12 text-center text-[#debec8] bg-[#1c1b1d] rounded-2xl border border-[#353437]">
            <span className="material-symbols-outlined text-4xl mb-2 text-[#ffb0cd]">video_library</span>
            <p className="text-lg font-medium">No videos match filter "{selectedSubtag}".</p>
          </div>
        )}
      </section>
    </main>
  );
};
