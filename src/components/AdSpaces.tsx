import React, { useEffect, useRef } from 'react';

interface AdBannerProps {
  position: 'banner_top' | 'banner_bottom' | 'card_inline' | 'sidebar';
  scriptUrl?: string;
  bannerImage?: string;
  targetUrl?: string;
  title?: string;
  className?: string;
}

export const AdBanner: React.FC<AdBannerProps> = ({
  position,
  scriptUrl,
  bannerImage,
  targetUrl = '#',
  title = 'Sponsored Advertisement',
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scriptUrl || !containerRef.current) return;

    // Non-blocking asynchronous third-party ad script injection
    const script = document.createElement('script');
    script.src = scriptUrl;
    script.async = true;
    script.setAttribute('data-ad-space', position);

    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [scriptUrl, position]);

  if (position === 'card_inline') {
    return (
      <div
        ref={containerRef}
        className={`group relative bg-[#18181c] border border-amber-500/30 rounded-2xl overflow-hidden shadow-lg p-3 flex flex-col justify-between ${className}`}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="bg-amber-500/20 text-amber-400 text-[9px] font-black uppercase px-2 py-0.5 rounded border border-amber-500/30">
            Ad
          </span>
          <span className="text-[10px] text-white/50">{title}</span>
        </div>

        {bannerImage ? (
          <a href={targetUrl} target="_blank" rel="noopener noreferrer" className="block aspect-[16/9] w-full rounded-xl overflow-hidden">
            <img src={bannerImage} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
          </a>
        ) : (
          <div className="aspect-[16/9] bg-gradient-to-br from-amber-500/10 to-rose-500/10 rounded-xl flex items-center justify-center border border-white/5">
            <span className="text-xs text-white/70 font-semibold">{title}</span>
          </div>
        )}
      </div>
    );
  }

  // If no banner image or script URL is configured, hide placeholder completely
  if (!bannerImage && !scriptUrl) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={`w-full bg-[#121215] border border-white/10 rounded-xl p-2.5 flex items-center justify-center my-3 overflow-hidden ${className}`}
    >
      <a href={targetUrl} target="_blank" rel="noopener noreferrer" className="block w-full max-w-4xl text-center">
        <img src={bannerImage} alt={title} className="max-h-24 w-full object-contain mx-auto rounded-lg" />
      </a>
    </div>
  );
};

export const PopunderTrigger: React.FC<{ popunderUrl?: string }> = ({ popunderUrl }) => {
  useEffect(() => {
    if (!popunderUrl) return;

    let triggered = false;
    const handleFirstClick = () => {
      if (triggered) return;
      triggered = true;
      try {
        window.open(popunderUrl, '_blank');
      } catch (e) {
        console.warn('[AdSpaces] Pop-under blocked or prevented:', e);
      }
      window.removeEventListener('click', handleFirstClick);
    };

    window.addEventListener('click', handleFirstClick, { once: true });
    return () => window.removeEventListener('click', handleFirstClick);
  }, [popunderUrl]);

  return null;
};

export default AdBanner;
