import fs from "fs";
import path from "path";
import readline from "readline";

const ALL_CATEGORIES = [
  "trending", "vr", "desi", "amateur", "milf", "teen", "anal", "lesbian", "gay", "transgender",
  "pov", "big-tits", "big-ass", "blowjob", "creampie", "threesome", "interracial",
  "ebony", "latina", "asian", "hentai", "hardcore", "fetish", "masturbation", "public", "mature"
];

function formatDuration(sec) {
  if (!sec || isNaN(sec)) return "08:30";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
}

function formatViews(v) {
  if (!v || isNaN(v)) return "250K";
  if (v >= 1000000) return (v / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  if (v >= 1000) return (v / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(v);
}

function getLabel(c) {
  const map = {
    trending: "Trending", vr: "VR (Virtual Reality)", desi: "Desi / Indian", amateur: "Amateur",
    milf: "MILF", teen: "Teen (18+)", anal: "Anal", lesbian: "Lesbian", gay: "Gay",
    transgender: "Transgender", pov: "POV", "big-tits": "Big Tits", "big-ass": "Big Ass",
    blowjob: "Blowjob & Oral", creampie: "Creampie", threesome: "Threesome & Groups",
    interracial: "Interracial", ebony: "Ebony", latina: "Latina", asian: "Asian",
    hentai: "Hentai / 3D", hardcore: "Hardcore", fetish: "Fetish & BDSM",
    masturbation: "Masturbation & Solo", public: "Public & Outdoor", mature: "Mature & Vintage"
  };
  return map[c] || c;
}

function normalizeTitle(t) {
  return (t || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function matchCats(title, catRaw, tagsRaw) {
  const t = (String(title) + " " + String(catRaw) + " " + String(tagsRaw)).toLowerCase();
  const matched = new Set();
  if (t.includes("vr") || t.includes("virtual reality") || t.includes("360") || t.includes("oculus") || t.includes("180 vr")) matched.add("vr");
  if (t.includes("desi") || t.includes("indian") || t.includes("hindi") || t.includes("bhabhi") || t.includes("punjabi") || t.includes("tamil") || t.includes("mallu")) matched.add("desi");
  if (t.includes("amateur") || t.includes("homemade") || t.includes("verified")) matched.add("amateur");
  if (t.includes("milf") || t.includes("mom") || t.includes("mature")) matched.add("milf");
  if (t.includes("teen") || t.includes("18-25") || t.includes("18 year") || t.includes("college") || t.includes("babe")) matched.add("teen");
  if (t.includes("anal") || t.includes("ass fuck")) matched.add("anal");
  if (t.includes("lesbian") || t.includes("girls kissing") || t.includes("tribbing")) matched.add("lesbian");
  if (t.includes("gay") || t.includes("twink") || t.includes("bareback gay")) matched.add("gay");
  if (t.includes("transgender") || t.includes("shemale") || t.includes("tranny") || t.includes("ladyboy") || t.includes("ts ")) matched.add("transgender");
  if (t.includes("pov") || t.includes("point of view")) matched.add("pov");
  if (t.includes("big tits") || t.includes("big-tits") || t.includes("huge boobs") || t.includes("big boobs") || t.includes("natural tits") || t.includes("tits")) matched.add("big-tits");
  if (t.includes("big ass") || t.includes("big-ass") || t.includes("booty") || t.includes("thick") || t.includes("pawg") || t.includes("ass")) matched.add("big-ass");
  if (t.includes("blowjob") || t.includes("deepthroat") || t.includes("sucking") || t.includes("oral") || t.includes("throat")) matched.add("blowjob");
  if (t.includes("creampie") || t.includes("cumshot") || t.includes("jizz") || t.includes("swallow") || t.includes("facial")) matched.add("creampie");
  if (t.includes("threesome") || t.includes("foursome") || t.includes("orgy") || t.includes("gangbang") || t.includes("group") || t.includes("ffm") || t.includes("mmf")) matched.add("threesome");
  if (t.includes("interracial") || t.includes("bbc") || t.includes("blacked") || t.includes("white girl")) matched.add("interracial");
  if (t.includes("ebony") || t.includes("black woman")) matched.add("ebony");
  if (t.includes("latina") || t.includes("brazilian") || t.includes("colombian") || t.includes("mexican")) matched.add("latina");
  if (t.includes("asian") || t.includes("japanese") || t.includes("korean") || t.includes("jav") || t.includes("chinese")) matched.add("asian");
  if (t.includes("hentai") || t.includes("anime") || t.includes("3d") || t.includes("sfm") || t.includes("cartoon") || t.includes("overwatch")) matched.add("hentai");
  if (t.includes("hardcore") || t.includes("rough") || t.includes("violent") || t.includes("choking")) matched.add("hardcore");
  if (t.includes("fetish") || t.includes("bdsm") || t.includes("bondage") || t.includes("feet") || t.includes("foot") || t.includes("nylon") || t.includes("stockings")) matched.add("fetish");
  if (t.includes("masturbation") || t.includes("solo") || t.includes("dildo") || t.includes("toy") || t.includes("fingering") || t.includes("webcam")) matched.add("masturbation");
  if (t.includes("public") || t.includes("outdoor") || t.includes("car") || t.includes("street") || t.includes("beach") || t.includes("park")) matched.add("public");
  if (t.includes("mature") || t.includes("vintage") || t.includes("granny") || t.includes("older") || t.includes("retro")) matched.add("mature");

  matched.add("trending");
  return Array.from(matched);
}

const csvPath = path.join(process.cwd(), "affiliate-webmaster", "pornhub.com-db", "pornhub.com-db.csv");
const buckets = {};
for (const c of ALL_CATEGORIES) {
  buckets[c] = [];
}

// Multi-Key Strict Deduplication Trackers
const seenIds = new Set();
const seenEmbeds = new Set();
const seenThumbs = new Set();
const seenExactTitles = new Set();
const seenNormTitles = new Set();

const TARGET_PER_CAT = 75;
const globalUniqueList = [];

const fileStream = fs.createReadStream(csvPath);
const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

let row = 0;
let isDone = false;
const baseTime = Date.now();

rl.on("line", (line) => {
  if (isDone) return;
  row++;
  if (row === 1 && line.startsWith("embed_url|")) return;

  const cols = line.split("|");
  if (cols.length < 13) return;

  const rawEmbed = (cols[0] || "").trim();
  const title = (cols[3] || "").trim();
  const viewsCount = parseInt(cols[8], 10) || 0;
  if (!rawEmbed || !title || viewsCount < 6000) return;

  // 1. Check Exact & Normalized Title
  const lowerTitle = title.toLowerCase();
  const normTitle = normalizeTitle(title);
  if (normTitle.length < 4) return;
  if (seenExactTitles.has(lowerTitle) || seenNormTitles.has(normTitle)) return;

  // 2. Check Embed URL & ViewKey
  const keyMatch = rawEmbed.match(/\/embed\/([a-zA-Z0-9_-]+)/i) || rawEmbed.match(/viewkey=([a-zA-Z0-9_-]+)/i);
  const vKey = keyMatch ? keyMatch[1] : "";
  if (!vKey) return;

  const vidId = "ph-" + vKey;
  const cleanEmbed = "https://www.pornhub.com/embed/" + vKey;
  const lowerEmbed = cleanEmbed.toLowerCase();

  if (seenIds.has(vidId) || seenEmbeds.has(lowerEmbed)) return;

  // 3. Check Primary Thumbnail
  const primaryThumb = cols[11] && cols[11].startsWith("http") ? cols[11].trim() : (cols[1] || "").trim();
  if (!primaryThumb || seenThumbs.has(primaryThumb)) return;

  const tagsStr = cols[4] || "";
  const catStr = cols[5] || "";
  const pornstarsStr = cols[6] || "";

  const matched = matchCats(title, catStr, tagsStr);

  // Only accept video if its matched category still needs items, or if global quota is not met
  let hungryCat = null;
  for (const c of matched) {
    if (buckets[c] && buckets[c].length < TARGET_PER_CAT) {
      hungryCat = c;
      break;
    }
  }

  // If no matched category needs more items, skip this row to save space for hungry categories
  if (!hungryCat) return;

  // Register in all deduplication trackers
  seenIds.add(vidId);
  seenEmbeds.add(lowerEmbed);
  seenThumbs.add(primaryThumb);
  seenExactTitles.add(lowerTitle);
  seenNormTitles.add(normTitle);

  const durationSec = parseInt(cols[7], 10) || 450;
  const upvotes = parseInt(cols[9], 10) || Math.round(viewsCount * 0.04);
  const downvotes = parseInt(cols[10], 10) || 0;
  const totalVotes = upvotes + downvotes;
  const ratingPct = totalVotes > 0 ? Math.round((upvotes / totalVotes) * 100) : 96;

  const framePreviews = (cols[12] || cols[2] || "").split(";").filter(Boolean);
  const actors = pornstarsStr.split(";").map((a) => a.trim()).filter(Boolean);
  const performerName = actors.length > 0 ? actors[0] : (getLabel(hungryCat) + " Star");

  let pref = "straight";
  if (matched.includes("lesbian")) pref = "lesbian";
  else if (matched.includes("gay")) pref = "gay";
  else if (matched.includes("transgender")) pref = "transgender";

  // Stagger createdAt timestamp naturally so sorting by latest is smooth and consistent
  const staggeredDate = new Date(baseTime - globalUniqueList.length * 120000).toISOString();

  const item = {
    id: vidId,
    title: title,
    category: hungryCat,
    categoryLabel: getLabel(hungryCat),
    categories: matched,
    tags: Array.from(new Set([...tagsStr.split(";").map((t) => t.trim()).filter(Boolean), ...matched.map(getLabel)])).slice(0, 15),
    modelsActors: actors.length > 0 ? actors : undefined,
    models_actors: actors.length > 0 ? actors : undefined,
    performers: actors.length > 0 ? actors : undefined,
    performerName: performerName,
    thumbnail: primaryThumb,
    thumbnailUrl: primaryThumb,
    previewFrames: framePreviews.length > 0 ? framePreviews : undefined,
    previewMp4Url: framePreviews.length > 0 ? framePreviews[Math.min(4, framePreviews.length - 1)] : undefined,
    duration: formatDuration(durationSec),
    quality: durationSec > 600 || viewsCount > 500000 ? "4K" : "HD",
    views: formatViews(viewsCount) + " views",
    viewsCount: viewsCount,
    likesCount: upvotes,
    rating: ratingPct + "%",
    timeAgo: "Trending now",
    createdAt: staggeredDate,
    description: "Watch " + title + " in 4K Ultra HD on FapnXX. Featuring top verified adult performers in " + getLabel(hungryCat) + ".",
    embedUrl: cleanEmbed,
    isEmbed: true,
    isExclusive: viewsCount > 1000000,
    isNew: true,
    orientation: hungryCat === "vr" ? "vr" : pref,
    contentPreference: pref,
    sourceWebsite: "Pornhub",
    sourceWebsiteUrl: "https://www.pornhub.com",
  };

  globalUniqueList.push(item);
  if (buckets[hungryCat]) {
    buckets[hungryCat].push(item);
  }

  let fullCount = 0;
  for (const c of ALL_CATEGORIES) {
    if (buckets[c] && buckets[c].length >= TARGET_PER_CAT) fullCount++;
  }

  if (fullCount === ALL_CATEGORIES.length || row > 800000) {
    if (!isDone) {
      isDone = true;
      console.log("Collection successfully completed at CSV row " + row + " with " + fullCount + " full categories (" + globalUniqueList.length + " 100% unique videos)!");
      rl.close();
      fileStream.destroy();
    }
  }
});

rl.on("close", () => {
  console.log("Total unique videos generated in dataset: " + globalUniqueList.length);
  const counts = {};
  for (const c of ALL_CATEGORIES) {
    counts[c] = buckets[c] ? buckets[c].length : 0;
  }
  console.log("Category breakdown:", JSON.stringify(counts, null, 2));

  const dest1 = path.join(process.cwd(), "src", "data", "pornhubCurated.json");
  const dest2 = path.join(process.cwd(), "public", "data", "videos_page1.json");

  fs.writeFileSync(dest1, JSON.stringify(globalUniqueList, null, 2), "utf8");
  fs.writeFileSync(dest2, JSON.stringify(globalUniqueList, null, 2), "utf8");
  console.log("Successfully saved massive library of " + globalUniqueList.length + " unique videos to pornhubCurated.json & videos_page1.json!");
});
