import fs from "fs";

const content = fs.readFileSync("src/components/AdSpaces.tsx", "utf8");
const startIndex = content.indexOf("export const NativeRecommendationAd");
const endIndex = content.indexOf("export const PopunderAd");

if (startIndex !== -1 && endIndex !== -1) {
  const before = content.substring(0, startIndex);
  const after = content.substring(endIndex);

  const newNativeSection = `interface NativeAdItem {
  image: string;
  optimum_image?: string;
  url: string;
  title: string;
  description?: string;
  brand?: string;
  size?: string;
}

/**
 * Native Recommendation Ad Widget (Multi-device: Desktop, Tablet, Mobile - Zone ID: 6010176)
 * Instant Live Feed with Rich Animated Thumbnails & Interactive Hover/Touch Previews
 */
export const NativeRecommendationAd: React.FC<{
  className?: string;
  title?: string;
  reloadKey?: string | number;
}> = ({ className = "", title = "Sponsored Recommendations", reloadKey }) => {
  const [items, setItems] = useState<NativeAdItem[]>([]);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const zoneId = AD_ZONES.NATIVE_RECOMMENDED || "6010176";

  const fetchFreshAds = useCallback(() => {
    const cb = \`\${Date.now()}_\${Math.random().toString(36).substring(2, 7)}\`;
    fetch(\`https://syndication.realsrv.com/splash.php?idzone=\${zoneId}&type=20&cb=\${cb}\`)
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.data) && data.data.length > 0) {
          setItems(data.data.slice(0, 4));
        }
      })
      .catch((err) => {
        console.warn("[ExoClick] Native recommendation fetch error:", err);
      });
  }, [zoneId]);

  useEffect(() => {
    fetchFreshAds();
    const handleRefresh = () => fetchFreshAds();
    window.addEventListener("exoclick-refresh-ads", handleRefresh);
    window.addEventListener("popstate", handleRefresh);
    return () => {
      window.removeEventListener("exoclick-refresh-ads", handleRefresh);
      window.removeEventListener("popstate", handleRefresh);
    };
  }, [fetchFreshAds, reloadKey]);

  if (items.length === 0) return null;

  return (
    <section className={\`native-recommendation-wrapper w-full my-4 \${className}\`}>
      {title && (
        <div className="flex items-center gap-2 mb-3">
          <span className="material-symbols-outlined text-rose-500 text-lg">recommend</span>
          <h3 className="font-bold text-sm sm:text-base text-zinc-900 dark:text-white tracking-wide">{title}</h3>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map((item, idx) => {
          const isHovered = hoveredIdx === idx;
          const displayImage = item.optimum_image || item.image;
          return (
            <a
              key={idx}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="group video-card flex flex-col w-full rounded-2xl overflow-hidden transition-all duration-300 active:scale-95 cursor-pointer bg-zinc-900/50 dark:bg-black/40 border border-zinc-200 dark:border-white/10 hover:border-[#ec4899] shadow-sm hover:shadow-[0_0_20px_rgba(236,72,153,0.25)]"
            >
              <div className="relative w-full aspect-[16/9] rounded-xl overflow-hidden bg-black flex items-center justify-center">
                <img
                  src={displayImage}
                  alt={item.title || "Sponsored Recommendation"}
                  className={\`w-full h-full object-cover transition-transform duration-500 \${
                    isHovered ? "scale-110" : "scale-100"
                  }\`}
                  loading="lazy"
                  decoding="async"
                />

                {/* Live Play Overlay Indicator on Hover/Touch */}
                <div
                  className={\`absolute inset-0 bg-black/30 flex items-center justify-center transition-opacity duration-300 \${
                    isHovered ? "opacity-100" : "opacity-0 pointer-events-none"
                  }\`}
                >
                  <div className="w-10 h-10 rounded-full bg-[#ec4899]/90 text-white flex items-center justify-center shadow-lg transform scale-100 hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-xl">play_arrow</span>
                  </div>
                </div>

                {/* AD Badge */}
                <div className="absolute top-2 right-2 z-10">
                  <span className="bg-[#ec4899] text-white px-2 py-0.5 rounded text-[10px] font-extrabold uppercase shadow-md tracking-wide">
                    AD
                  </span>
                </div>

                {/* Sponsor Brand Badge */}
                <div className="absolute bottom-2 left-2 z-10 bg-black/80 backdrop-blur-xs border border-white/15 px-2 py-0.5 rounded text-[10px] font-mono font-bold text-rose-400">
                  {item.brand || "SPONSORED"}
                </div>
              </div>

              <div className="video-info p-2.5 space-y-1">
                <h4 className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-white group-hover:text-[#ec4899] transition-colors line-clamp-2 leading-snug">
                  {item.title || "Recommended Video"}
                </h4>
                <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 pt-1 border-t border-zinc-100 dark:border-white/5">
                  <span className="flex items-center gap-1 text-rose-500 font-bold">
                    <span className="material-symbols-outlined text-[13px]">verified</span>
                    <span>{item.brand || "Promoted"}</span>
                  </span>
                  <span className="text-[10px] text-zinc-400 uppercase font-mono">Stream HD</span>
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
};

`;

  fs.writeFileSync("src/components/AdSpaces.tsx", before + newNativeSection + after, "utf8");
  console.log("Successfully replaced NativeRecommendationAd in AdSpaces.tsx");
} else {
  console.log("Indices not found:", { startIndex, endIndex });
}
