import fs from "fs";
import path from "path";
import readline from "readline";

const ALL_CATEGORIES = [
  "trending", "vr", "desi", "amateur", "milf", "teen", "anal", "lesbian", "gay", "transgender",
  "pov", "big-tits", "big-ass", "blowjob", "creampie", "threesome", "interracial",
  "ebony", "latina", "asian", "hentai", "hardcore", "fetish", "masturbation", "public", "mature"
];

function formatDuration(secondsNum) {
  if (isNaN(secondsNum) || secondsNum <= 0) return "08:30";
  const mins = Math.floor(secondsNum / 60);
  const secs = secondsNum % 60;
  return String(mins).padStart(2, "0") + ":" + String(secs).padStart(2, "0");
}

function formatViews(viewsNum) {
  if (isNaN(viewsNum) || viewsNum <= 0) return "250K";
  if (viewsNum >= 1000000) return (viewsNum / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  if (viewsNum >= 1000) return (viewsNum / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(viewsNum);
}

function getCategoryLabel(catId) {
  const map = {
    "trending": "Trending",
    "vr": "VR (Virtual Reality)",
    "desi": "Desi / Indian",
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
    "asian": "Asian",
    "hentai": "Hentai / 3D",
    "hardcore": "Hardcore",
    "fetish": "Fetish & BDSM",
    "masturbation": "Masturbation & Solo",
    "public": "Public & Outdoor",
    "mature": "Mature & Vintage"
  };
  return map[catId] || (catId.charAt(0).toUpperCase() + catId.slice(1));
}

function matchCategories(title, catRaw, tagsRaw) {
  const t = (String(title) + " " + String(catRaw) + " " + String(tagsRaw)).toLowerCase();
  const matched = new Set();

  if (t.includes("vr") || t.includes("virtual reality") || t.includes("360") || t.includes("oculus") || t.includes("180 vr")) matched.add("vr");
  if (t.includes("desi") || t.includes("indian") || t.includes("hindi") || t.includes("bhabhi") || t.includes("punjabi") || t.includes("tamil") || t.includes("mallu")) matched.add("desi");
  if (t.includes("amateur") || t.includes("homemade") || t.includes("verified")) matched.add("amateur");
  if (t.includes("milf") || t.includes("mom") || t.includes("mature")) matched.add("milf");
  if (t.includes("teen") || t.includes("18-25") || t.includes("18 year") || t.includes("college")) matched.add("teen");
  if (t.includes("anal") || t.includes("ass fuck")) matched.add("anal");
  if (t.includes("lesbian") || t.includes("girls kissing") || t.includes("tribbing")) matched.add("lesbian");
  if (t.includes("gay") || t.includes("twink") || t.includes("bareback gay")) matched.add("gay");
  if (t.includes("transgender") || t.includes("shemale") || t.includes("tranny") || t.includes("ladyboy") || t.includes("ts ")) matched.add("transgender");
  if (t.includes("pov") || t.includes("point of view")) matched.add("pov");
  if (t.includes("big tits") || t.includes("big-tits") || t.includes("huge boobs") || t.includes("big boobs") || t.includes("natural tits")) matched.add("big-tits");
  if (t.includes("big ass") || t.includes("big-ass") || t.includes("booty") || t.includes("thick") || t.includes("pawg")) matched.add("big-ass");
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

async function buildRichCatalog() {
  const csvPath = path.join(process.cwd(), "affiliate-webmaster", "pornhub.com-db", "pornhub.com-db.csv");
  console.log("Reading CSV database from:", csvPath);

  const rl = readline.createInterface({
    input: fs.createReadStream(csvPath),
    crlfDelay: Infinity,
  });

  const categoryBuckets = {};
  ALL_CATEGORIES.forEach(c => categoryBuckets[c] = []);
  const seenIds = new Set();
  const TARGET_PER_CATEGORY = 35;

  let rowIdx = 0;

  for await (const line of rl) {
    rowIdx++;
    if (rowIdx === 1 && line.startsWith("embed_url|")) continue;

    const cols = line.split("|");
    if (cols.length < 13) continue;

    const embedUrl = (cols[0] || "").trim();
    const title = (cols[3] || "").trim();
    const viewsCount = parseInt(cols[8], 10) || 0;

    if (!embedUrl || !title || viewsCount < 25000) continue;

    const lastSlash = embedUrl.lastIndexOf("/");
    const codeSegment = lastSlash !== -1 ? embedUrl.substring(lastSlash + 1).split("?")[0] : "";
    if (!codeSegment) continue;
    const vidId = "ph-" + codeSegment;
    if (seenIds.has(vidId)) continue;

    const tagsStr = cols[4] || "";
    const catStr = cols[5] || "";
    const pornstarsStr = cols[6] || "";

    const matchedCats = matchCategories(title, catStr, tagsStr);

    // Find any category that still needs videos
    const hungryCat = matchedCats.find(c => (categoryBuckets[c]?.length || 0) < TARGET_PER_CATEGORY);
    if (!hungryCat) continue;

    seenIds.add(vidId);

    const durationSec = parseInt(cols[7], 10) || 450;
    const upvotes = parseInt(cols[9], 10) || Math.round(viewsCount * 0.04);
    const downvotes = parseInt(cols[10], 10) || 0;
    const totalVotes = upvotes + downvotes;
    const ratingPct = totalVotes > 0 ? Math.round((upvotes / totalVotes) * 100) : 96;

    const primaryThumb = cols[11] && cols[11].startsWith("http") ? cols[11].trim() : (cols[1] || "").trim();
    const framePreviews = (cols[12] || cols[2] || "").split(";").filter(Boolean);

    const actors = pornstarsStr.split(";").map(a => a.trim()).filter(Boolean);
    const performerName = actors.length > 0 ? actors[0] : (getCategoryLabel(hungryCat) + " Creator");

    let pref = "straight";
    if (matchedCats.includes("lesbian")) pref = "lesbian";
    else if (matchedCats.includes("gay")) pref = "gay";
    else if (matchedCats.includes("transgender")) pref = "transgender";

    const videoItem = {
      id: vidId,
      title,
      category: hungryCat,
      categoryLabel: getCategoryLabel(hungryCat),
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
      description: "Watch " + title + " in 4K Ultra HD on FapnXX. Featuring top verified adult performers in " + getCategoryLabel(hungryCat) + ".",
      embedUrl,
      isEmbed: true,
      isExclusive: viewsCount > 1000000,
      isNew: true,
      orientation: pref,
      contentPreference: pref,
      sourceWebsite: "Pornhub",
      sourceWebsiteUrl: "https://www.pornhub.com",
    };

    // Add to all matched buckets that need videos
    matchedCats.forEach(c => {
      if (categoryBuckets[c] && categoryBuckets[c].length < TARGET_PER_CATEGORY) {
        categoryBuckets[c].push(videoItem);
      }
    });

    const isAllFull = ALL_CATEGORIES.every(c => (categoryBuckets[c]?.length || 0) >= TARGET_PER_CATEGORY);
    if (isAllFull) {
      console.log("All categories reached " + TARGET_PER_CATEGORY + " videos!");
      break;
    }
  }

  rl.close();

  // Consolidate all unique videos
  const uniqueMap = new Map();
  ALL_CATEGORIES.forEach(c => {
    (categoryBuckets[c] || []).forEach(v => {
      if (!uniqueMap.has(v.id)) {
        uniqueMap.set(v.id, v);
      }
    });
  });

  const finalVideos = Array.from(uniqueMap.values());
  console.log("Total unique videos collected across all categories:", finalVideos.length);

  const stats = {};
  ALL_CATEGORIES.forEach(c => {
    stats[c] = categoryBuckets[c]?.length || 0;
  });
  console.log("Category Distribution:", stats);

  const dest1 = path.join(process.cwd(), "src", "data", "pornhubCurated.json");
  const dest2 = path.join(process.cwd(), "public", "data", "videos_page1.json");

  fs.writeFileSync(dest1, JSON.stringify(finalVideos, null, 2), "utf8");
  fs.writeFileSync(dest2, JSON.stringify(finalVideos, null, 2), "utf8");

  console.log("Successfully saved dataset to src/data/pornhubCurated.json & public/data/videos_page1.json");
}

buildRichCatalog();
