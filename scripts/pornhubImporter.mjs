import fs from "fs";
import path from "path";
import readline from "readline";

export const ALL_TARGET_CATEGORIES = [
  "trending", "amateur", "milf", "teen", "anal", "lesbian", "gay", "transgender",
  "pov", "big-tits", "big-ass", "blowjob", "creampie", "threesome", "interracial",
  "ebony", "latina", "desi", "asian", "hentai", "vr", "hardcore", "fetish",
  "masturbation", "public", "mature"
];

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

export function extractCategories(catRaw, tagsRaw) {
  const combined = (String(catRaw) + " " + String(tagsRaw)).toLowerCase();
  const matched = new Set();

  if (combined.includes("amateur")) matched.add("amateur");
  if (combined.includes("milf")) matched.add("milf");
  if (combined.includes("teen") || combined.includes("18-25")) matched.add("teen");
  if (combined.includes("anal")) matched.add("anal");
  if (combined.includes("lesbian")) matched.add("lesbian");
  if (combined.includes("gay")) matched.add("gay");
  if (combined.includes("transgender") || combined.includes("shemale") || combined.includes("tranny") || combined.includes("ts")) matched.add("transgender");
  if (combined.includes("pov")) matched.add("pov");
  if (combined.includes("big tits") || combined.includes("big-tits") || combined.includes("tits") || combined.includes("boobs") || combined.includes("juggs")) matched.add("big-tits");
  if (combined.includes("big ass") || combined.includes("big-ass") || combined.includes("booty") || combined.includes("pawg")) matched.add("big-ass");
  if (combined.includes("blowjob") || combined.includes("deepthroat") || combined.includes("sucking") || combined.includes("oral")) matched.add("blowjob");
  if (combined.includes("creampie") || combined.includes("cumshot") || combined.includes("jizz")) matched.add("creampie");
  if (combined.includes("threesome") || combined.includes("foursome") || combined.includes("orgy") || combined.includes("gangbang") || combined.includes("group")) matched.add("threesome");
  if (combined.includes("interracial") || combined.includes("bbc") || combined.includes("black")) matched.add("interracial");
  if (combined.includes("ebony")) matched.add("ebony");
  if (combined.includes("latina") || combined.includes("brazilian")) matched.add("latina");
  if (combined.includes("desi") || combined.includes("indian") || combined.includes("hindi") || combined.includes("bhabhi")) matched.add("desi");
  if (combined.includes("asian") || combined.includes("japanese") || combined.includes("korean") || combined.includes("jav")) matched.add("asian");
  if (combined.includes("hentai") || combined.includes("anime") || combined.includes("3d") || combined.includes("cartoon")) matched.add("hentai");
  if (combined.includes("vr")) matched.add("vr");
  if (combined.includes("hardcore") || combined.includes("rough")) matched.add("hardcore");
  if (combined.includes("fetish") || combined.includes("bdsm") || combined.includes("bondage") || combined.includes("feet")) matched.add("fetish");
  if (combined.includes("masturbation") || combined.includes("solo") || combined.includes("dildo") || combined.includes("toy")) matched.add("masturbation");
  if (combined.includes("public") || combined.includes("outdoor") || combined.includes("street")) matched.add("public");
  if (combined.includes("mature") || combined.includes("vintage") || combined.includes("granny")) matched.add("mature");

  matched.add("trending");
  return Array.from(matched);
}

export function getCategoryLabel(catId) {
  const map = {
    "trending": "Trending",
    "amateur": "Amateur",
    "milf": "MILF",
    "teen": "Teen (18+)",
    "anal": "Anal",
    "lesbian": "Lesbian",
    "gay": "Gay",
    "transgender": "Transgender",
    "pov": "POV",
    "big-tits": "Big Tits",
    "big-ass": "Big Ass",
    "blowjob": "Blowjob & Oral",
    "creampie": "Creampie",
    "threesome": "Threesome & Groups",
    "interracial": "Interracial",
    "ebony": "Ebony",
    "latina": "Latina",
    "desi": "Desi / Indian",
    "asian": "Asian",
    "hentai": "Hentai / 3D",
    "vr": "VR",
    "hardcore": "Hardcore",
    "fetish": "Fetish & BDSM",
    "masturbation": "Masturbation & Solo",
    "public": "Public & Outdoor",
    "mature": "Mature & Vintage"
  };
  return map[catId] || (catId.charAt(0).toUpperCase() + catId.slice(1));
}

export async function parsePornhubDb(options = {}) {
  const csvPath = options.csvPath || path.join(process.cwd(), "affiliate-webmaster", "pornhub.com-db", "pornhub.com-db.csv");
  const atsCode = options.atsCode || "";
  const minViews = options.minViews !== undefined ? options.minViews : 50000;
  const maxPerCategory = options.maxPerCategory || 35;
  const targetCategories = options.targetCategories || ALL_TARGET_CATEGORIES;
  const searchQuery = (options.searchQuery || "").toLowerCase().trim();

  if (!fs.existsSync(csvPath)) {
    throw new Error("CSV file not found at: " + csvPath);
  }

  const categoryCounts = {};
  targetCategories.forEach(c => categoryCounts[c] = 0);

  const matchedVideos = [];
  const seenIds = new Set();
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
    embedUrl = embedUrl.replace("pornhub.com/embed/", "pornhub.org/embed/");

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

    const matchedCats = extractCategories(catStr, tagsStr);
    const primaryCat = matchedCats.find(c => c !== "trending") || "trending";

    // Determine if this video satisfies any category needing more videos
    const needyCategory = matchedCats.find(c => targetCategories.includes(c) && (categoryCounts[c] || 0) < maxPerCategory);
    if (!needyCategory && !searchQuery) {
      const allDone = targetCategories.every(c => (categoryCounts[c] || 0) >= maxPerCategory);
      if (allDone) break;
      continue;
    }

    const lastSlash = embedUrl.lastIndexOf("/");
    const codeSegment = lastSlash !== -1 ? embedUrl.substring(lastSlash + 1).split("?")[0] : String(Date.now());
    const vidId = "ph-" + codeSegment;

    if (seenIds.has(vidId)) continue;
    seenIds.add(vidId);

    const durationSec = parseInt(cols[7], 10) || 300;
    const upvotes = parseInt(cols[9], 10) || 0;
    const downvotes = parseInt(cols[10], 10) || 0;
    const totalVotes = upvotes + downvotes;
    const ratingPct = totalVotes > 0 ? Math.round((upvotes / totalVotes) * 100) : 95;

    const primaryThumb = cols[11] && cols[11].startsWith("http") ? cols[11].trim() : (cols[1] || "").trim();
    const framePreviews = (cols[12] || cols[2] || "").split(";").filter(Boolean);

    const actors = pornstarsStr.split(";").map(a => a.trim()).filter(Boolean);
    const performerName = actors.length > 0 ? actors[0] : (getCategoryLabel(primaryCat) + " Creator");

    let pref = "straight";
    if (matchedCats.includes("lesbian")) pref = "lesbian";
    else if (matchedCats.includes("gay")) pref = "gay";
    else if (matchedCats.includes("transgender")) pref = "transgender";

    const videoItem = {
      id: vidId,
      title,
      category: primaryCat,
      categoryLabel: getCategoryLabel(primaryCat),
      categories: matchedCats,
      tags: Array.from(new Set([...tagsStr.split(";").map(t => t.trim()).filter(Boolean), ...matchedCats.map(getCategoryLabel)])).slice(0, 15),
      modelsActors: actors.length > 0 ? actors : undefined,
      models_actors: actors.length > 0 ? actors : undefined,
      performers: actors.length > 0 ? actors : undefined,
      performerName,
      thumbnail: primaryThumb,
      thumbnailUrl: primaryThumb,
      previewFrames: framePreviews.length > 0 ? framePreviews : undefined,
      previewMp4Url: framePreviews.length > 0 ? framePreviews[Math.min(4, framePreviews.length - 1)] : undefined,
      duration: formatDuration(durationSec),
      quality: durationSec > 600 || viewsCount > 500000 ? "4K" : "HD",
      views: formatViews(viewsCount) + " views",
      viewsCount,
      likesCount: upvotes,
      rating: ratingPct + "%",
      timeAgo: "Trending now",
      createdAt: new Date().toISOString(),
      description: "Watch " + title + " in 4K Ultra HD on FapnXX. Featuring top verified adult performers in " + getCategoryLabel(primaryCat) + ".",
      embedUrl,
      isEmbed: true,
      isExclusive: viewsCount > 1000000,
      isNew: true,
      orientation: pref,
      contentPreference: pref,
      sourceWebsite: "Pornhub",
      sourceWebsiteUrl: "https://www.pornhub.com",
    };

    matchedVideos.push(videoItem);
    matchedCats.forEach(c => {
      if (categoryCounts[c] !== undefined) {
        categoryCounts[c] = (categoryCounts[c] || 0) + 1;
      }
    });

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

console.log("Starting Full 26-Category Pornhub DB Curated Importer...");
const outPath = path.join(process.cwd(), "src", "data", "pornhubCurated.json");
parsePornhubDb({
  outputPath: outPath,
  maxPerCategory: 30,
  minViews: 50000,
}).then((res) => {
  console.log("? Multi-Category Import Complete!");
  console.log("Category Counts:", JSON.stringify(res.categoryCounts, null, 2));
  console.log("Total Curated Videos:", res.matchedCount);
}).catch((err) => {
  console.error("? Importer error:", err);
});
