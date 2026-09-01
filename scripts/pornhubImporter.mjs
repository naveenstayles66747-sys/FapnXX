import fs from "fs";
import path from "path";
import readline from "readline";

export function formatDuration(secondsNum) {
  if (isNaN(secondsNum) || secondsNum <= 0) return "05:00";
  const mins = Math.floor(secondsNum / 60);
  const secs = secondsNum % 60;
  return String(mins).padStart(2, "0") + ":" + String(secs).padStart(2, "0");
}

export function formatViews(viewsNum) {
  if (isNaN(viewsNum) || viewsNum <= 0) return "1K";
  if (viewsNum >= 1000000) return (viewsNum / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  if (viewsNum >= 1000) return (viewsNum / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(viewsNum);
}

export function mapCategory(catRaw, tagsRaw) {
  const combined = (String(catRaw) + " " + String(tagsRaw)).toLowerCase();
  if (combined.includes("amateur")) return { id: "amateur", label: "Amateur" };
  if (combined.includes("milf")) return { id: "milf", label: "MILF" };
  if (combined.includes("teen") || combined.includes("18-25")) return { id: "teen", label: "Teen" };
  if (combined.includes("anal")) return { id: "anal", label: "Anal" };
  if (combined.includes("lesbian")) return { id: "lesbian", label: "Lesbian" };
  if (combined.includes("pov")) return { id: "pov", label: "POV" };
  if (combined.includes("desi") || combined.includes("indian") || combined.includes("hindi")) return { id: "desi", label: "Desi" };
  if (combined.includes("asian") || combined.includes("japanese") || combined.includes("korean")) return { id: "asian", label: "Asian" };
  if (combined.includes("hentai") || combined.includes("anime") || combined.includes("3d")) return { id: "hentai", label: "Hentai" };
  if (combined.includes("vr")) return { id: "vr", label: "VR" };
  return { id: "trending", label: "Trending" };
}

export async function parsePornhubDb(options = {}) {
  const csvPath = options.csvPath || path.join(process.cwd(), "affiliate-webmaster", "pornhub.com-db", "pornhub.com-db.csv");
  const atsCode = options.atsCode || "";
  const minViews = options.minViews !== undefined ? options.minViews : 50000;
  const maxPerCategory = options.maxPerCategory || 30;
  const targetCategories = options.targetCategories || ["trending", "amateur", "milf", "teen", "anal", "lesbian", "pov", "desi", "asian"];
  const searchQuery = (options.searchQuery || "").toLowerCase().trim();

  if (!fs.existsSync(csvPath)) {
    throw new Error("CSV file not found at: " + csvPath);
  }

  const categoryCounts = {};
  targetCategories.forEach(c => categoryCounts[c] = 0);

  const matchedVideos = [];
  const fileStream = fs.createReadStream(csvPath, { encoding: "utf8" });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let processedRows = 0;

  for await (const line of rl) {
    processedRows++;
    if (!line || !line.includes("|")) continue;

    const cols = line.split("|");
    if (cols.length < 9) continue;

    const embedHtml = cols[0] || "";
    const srcIdx = embedHtml.indexOf("src=");
    if (srcIdx === -1) continue;
    const sub = embedHtml.substring(srcIdx + 5);
    const quoteChar = embedHtml[srcIdx + 4];
    const endQuoteIdx = sub.indexOf(quoteChar);
    let embedUrl = endQuoteIdx !== -1 ? sub.substring(0, endQuoteIdx) : "";
    if (!embedUrl) continue;

    if (atsCode) {
      embedUrl += embedUrl.includes("?") ? ("&ats=" + atsCode) : ("?ats=" + atsCode);
    }

    const title = (cols[3] || "").trim();
    if (!title) continue;

    const viewsCount = parseInt(cols[8], 10) || 0;
    if (viewsCount < minViews) continue;

    const tagsStr = cols[4] || "";
    const catStr = cols[5] || "";
    const pornstarsStr = cols[6] || "";

    if (searchQuery) {
      const fullText = (title + " " + tagsStr + " " + catStr + " " + pornstarsStr).toLowerCase();
      if (!fullText.includes(searchQuery)) continue;
    }

    const catMapping = mapCategory(catStr, tagsStr);
    const catId = catMapping.id;

    if (categoryCounts[catId] !== undefined && categoryCounts[catId] >= maxPerCategory && !searchQuery) {
      const allFilled = targetCategories.every(c => (categoryCounts[c] || 0) >= maxPerCategory);
      if (allFilled) break;
      continue;
    }

    const durationSec = parseInt(cols[7], 10) || 300;
    const upvotes = parseInt(cols[9], 10) || 0;
    const downvotes = parseInt(cols[10], 10) || 0;
    const totalVotes = upvotes + downvotes;
    const ratingPct = totalVotes > 0 ? Math.round((upvotes / totalVotes) * 100) : 95;

    const primaryThumb = cols[11] && cols[11].startsWith("http") ? cols[11].trim() : (cols[1] || "").trim();
    const framePreviews = (cols[12] || cols[2] || "").split(";").filter(Boolean);

    const actors = pornstarsStr.split(";").map(a => a.trim()).filter(Boolean);
    const performerName = actors.length > 0 ? actors[0] : (catMapping.label + " Creator");

    const lastSlash = embedUrl.lastIndexOf("/");
    const codeSegment = lastSlash !== -1 ? embedUrl.substring(lastSlash + 1).split("?")[0] : String(Date.now());
    const vidId = "ph-" + codeSegment;

    const videoItem = {
      id: vidId,
      title,
      category: catId,
      categoryLabel: catMapping.label,
      categories: [catId, ...catStr.split(";").map(c => c.trim().toLowerCase()).filter(Boolean)].slice(0, 5),
      tags: Array.from(new Set([...tagsStr.split(";").map(t => t.trim()).filter(Boolean), catMapping.label])).slice(0, 12),
      modelsActors: actors.length > 0 ? actors : undefined,
      models_actors: actors.length > 0 ? actors : undefined,
      performers: actors.length > 0 ? actors : undefined,
      performerName,
      thumbnail: primaryThumb,
      thumbnailUrl: primaryThumb,
      previewMp4Url: framePreviews.length > 0 ? framePreviews[Math.min(4, framePreviews.length - 1)] : undefined,
      duration: formatDuration(durationSec),
      quality: durationSec > 600 || viewsCount > 500000 ? "4K" : "HD",
      views: formatViews(viewsCount) + " views",
      viewsCount,
      likesCount: upvotes,
      rating: ratingPct + "%",
      timeAgo: "Trending now",
      createdAt: new Date().toISOString(),
      description: "Watch " + title + " in 4K Ultra HD on FapnXX. Featuring top verified adult creators.",
      embedUrl,
      isEmbed: true,
      isExclusive: viewsCount > 1000000,
      isNew: true,
      orientation: catId === "lesbian" ? "lesbian" : "straight",
      contentPreference: catId === "lesbian" ? "lesbian" : "straight",
      sourceWebsite: "Pornhub",
      sourceWebsiteUrl: "https://www.pornhub.com",
    };

    matchedVideos.push(videoItem);
    categoryCounts[catId] = (categoryCounts[catId] || 0) + 1;

    if (!searchQuery && targetCategories.every(c => (categoryCounts[c] || 0) >= maxPerCategory)) {
      break;
    }
  }

  rl.close();

  if (options.outputPath) {
    const dir = path.dirname(options.outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(options.outputPath, JSON.stringify(matchedVideos, null, 2), "utf8");
    console.log("Successfully exported " + matchedVideos.length + " videos to: " + options.outputPath);
  }

  return {
    totalParsed: processedRows,
    matchedCount: matchedVideos.length,
    categoryCounts,
    videos: matchedVideos,
  };
}

console.log("Starting Pornhub DB Curated Importer...");
const outPath = path.join(process.cwd(), "src", "data", "pornhubCurated.json");
parsePornhubDb({
  outputPath: outPath,
  maxPerCategory: 30,
  minViews: 200000,
}).then((res) => {
  console.log("? Import Complete!");
  console.log("Category Counts:", res.categoryCounts);
  console.log("Total Curated Videos:", res.matchedCount);
}).catch((err) => {
  console.error("? Importer error:", err);
});
