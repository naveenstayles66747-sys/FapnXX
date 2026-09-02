import fs from "fs";

const content = fs.readFileSync("src/components/AdSpaces.tsx", "utf8");
const nativeSectionIndex = content.indexOf("interface NativeAdItem");
if (nativeSectionIndex !== -1) {
  const before = content.substring(0, nativeSectionIndex);
  const afterIndex = content.indexOf("export const PopunderAd");
  const after = content.substring(afterIndex);

  const newNativeSection = `/**
 * Native Recommendation Ad Widget (Multi-device: Desktop, Tablet, Mobile - Zone ID: 6010176)
 * Official ExoClick HTML5 Native Video Widget with Auto-Hover Preview & Touch Scrub
 */
export const NativeRecommendationAd: React.FC<{
  className?: string;
  title?: string;
  reloadKey?: string | number;
}> = ({ className = "", title = "Sponsored Recommendations", reloadKey }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const renderOfficialWidget = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    try {
      el.innerHTML = "";

      if (!document.getElementById("exoclick-global-ad-provider")) {
        const sdk = document.createElement("script");
        sdk.id = "exoclick-global-ad-provider";
        sdk.type = "application/javascript";
        sdk.async = true;
        sdk.src = "https://a.magsrv.com/ad-provider.js";
        document.head.appendChild(sdk);
      }

      const ins = document.createElement("ins");
      ins.className = "eas" + AD_ZONES.SITE_HASH + "20";
      ins.setAttribute("data-zoneid", AD_ZONES.NATIVE_RECOMMENDED || "6010176");
      ins.style.display = "block";
      ins.style.width = "100%";
      ins.style.margin = "0 auto";
      el.appendChild(ins);

      const triggerScript = document.createElement("script");
      triggerScript.type = "application/javascript";
      triggerScript.text = '(window.AdProvider = window.AdProvider || []).push({"serve": {}});';
      el.appendChild(triggerScript);

      const triggerAdServe = () => {
        try {
          const win = window as any;
          win.AdProvider = win.AdProvider || [];
          win.AdProvider.push({ serve: {} });
        } catch {}
      };

      triggerAdServe();
      setTimeout(triggerAdServe, 100);
      setTimeout(triggerAdServe, 400);
      setTimeout(triggerAdServe, 1000);
    } catch (e) {
      console.warn("[ExoClick] Native recommendation widget error:", e);
    }
  }, []);

  useEffect(() => {
    renderOfficialWidget();
    const handleTrigger = () => {
      renderOfficialWidget();
    };
    window.addEventListener("exoclick-refresh-ads", handleTrigger);
    window.addEventListener("popstate", handleTrigger);
    return () => {
      window.removeEventListener("exoclick-refresh-ads", handleTrigger);
      window.removeEventListener("popstate", handleTrigger);
    };
  }, [renderOfficialWidget, reloadKey]);

  return (
    <div className={\`native-recommendation-wrapper w-full my-4 \${className}\`}>
      {title && (
        <div className="flex items-center gap-2 mb-3">
          <span className="material-symbols-outlined text-rose-500 text-lg">recommend</span>
          <h3 className="font-bold text-base text-zinc-900 dark:text-white">{title}</h3>
        </div>
      )}
      <div
        ref={containerRef}
        id="exoclick-native-recommended-zone"
        className="w-full min-h-[160px] overflow-hidden rounded-2xl"
      />
    </div>
  );
};

`;

  fs.writeFileSync("src/components/AdSpaces.tsx", before + newNativeSection + after, "utf8");
  console.log("Successfully updated AdSpaces.tsx in UTF-8!");
} else {
  console.log("Could not find nativeSectionIndex in AdSpaces.tsx");
}
