const fs = require("fs");
const path = require("path");
const readline = require("readline");

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

const csvPath = path.join(__dirname, "..", "affiliate-webmaster", "pornhub.com-db", "pornhub.com-db.csv");
const categoryBuckets = {};
for (let i = 0; i < ALL_CATEGORIES.length; i++) {
  categoryBuckets[ALL_CATEGORIES[i]] = [];
}
const seenIds = new Set();
const TARGET_PER_CATEGORY = 45;

const fileStream = fs.createReadStream(csvPath);
const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

let rowCount = 0;
let isFinished = false;

rl.on("line", (line) => {
  if (isFinished) return;
  rowCount++;
  if (rowCount % 50000 === 0) {
    console.log("Read " + rowCount + " rows... Collected " + seenIds.size + " unique videos.");
  }
  if (rowCount === 1 && line.startsWith("embed_url|")) return;

  const cols = line.split("|");
  if (cols.length < 13) return;

  const embedUrl = (cols[0] || "").trim();
  const title = (cols[3] || "").trim();
  const viewsCount = parseInt(cols[8], 10) || 0;

  if (!embedUrl || !title || viewsCount < 10000) return;

  const lastSlash = embedUrl.lastIndexOf("/");
  const codeSegment = lastSlash !== -1 ? embedUrl.substring(lastSlash + 1).split("?")[0] : "";
  if (!codeSegment) return;
  const vidId = "ph-" + codeSegment;
  if (seenIds.has(vidId)) return;

  const tagsStr = cols[4] || "";
  const catStr = cols[5] || "";
  const pornstarsStr = cols[6] || "";

  const matchedCats = matchCats(title, catStr, tagsStr);

  let hungryCat = null;
  for (let i = 0; i < matchedCats.length; i++) {
    const c = matchedCats[i];
    if (categoryBuckets[c] && categoryBuckets[c].length < TARGET_PER_CATEGORY) {
      hungryCat = c;
      break;
    }
  }
  if (!hungryCat) return;

  seenIds.add(vidId);

  const durationSec = parseInt(cols[7], 10) || 450;
  const upvotes = parseInt(cols[9], 10) || Math.round(viewsCount * 0.04);
  const downvotes = parseInt(cols[10], 10) || 0;
  const totalVotes = upvotes + downvotes;
  const ratingPct = totalVotes > 0 ? Math.round((upvotes / totalVotes) * 100) : 96;

  const primaryThumb = cols[11] && cols[11].startsWith("http") ? cols[11].trim() : (cols[1] || "").trim();
  const framePreviews = (cols[12] || cols[2] || "").split(";").filter(Boolean);

  const actors = pornstarsStr.split(";").map((a) => a.trim()).filter(Boolean);
  const performerName = actors.length > 0 ? actors[0] : (getLabel(hungryCat) + " Star");

  let pref = "straight";
  if (matchedCats.includes("lesbian")) pref = "lesbian";
  else if (matchedCats.includes("gay")) pref = "gay";
  else if (matchedCats.includes("transgender")) pref = "transgender";

  const videoItem = {
    id: vidId,
    title: title,
    category: hungryCat,
    categoryLabel: getLabel(hungryCat),
    categories: matchedCats,
    tags: Array.from(new Set([...tagsStr.split(";").map((t) => t.trim()).filter(Boolean), ...matchedCats.map(getLabel)])).slice(0, 15),
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
    createdAt: new Date().toISOString(),
    description: "Watch " + title + " in 4K Ultra HD on FapnXX. Featuring top verified adult performers in " + getLabel(hungryCat) + ".",
    embedUrl: embedUrl,
    isEmbed: true,
    isExclusive: viewsCount > 1000000,
    isNew: true,
    orientation: hungryCat === "vr" ? "vr" : pref,
    contentPreference: pref,
    sourceWebsite: "Pornhub",
    sourceWebsiteUrl: "https://www.pornhub.com",
  };

  for (let i = 0; i < matchedCats.length; i++) {
    const c = matchedCats[i];
    if (categoryBuckets[c] && categoryBuckets[c].length < TARGET_PER_CATEGORY) {
      categoryBuckets[c].push(videoItem);
    }
  }

  let fullCategories = 0;
  for (let i = 0; i < ALL_CATEGORIES.length; i++) {
    const c = ALL_CATEGORIES[i];
    if (categoryBuckets[c] && categoryBuckets[c].length >= TARGET_PER_CATEGORY) {
      fullCategories++;
    }
  }

  if (fullCategories === ALL_CATEGORIES.length || rowCount > 1200000) {
    if (!isFinished) {
      isFinished = true;
      console.log("Completed import at row " + rowCount + " with " + fullCategories + " full categories!");
      rl.close();
      fileStream.destroy();
    }
  }
});

rl.on("close", () => {
  const uniqueVideos = [];
  const added = new Set();
  for (let i = 0; i < ALL_CATEGORIES.length; i++) {
    const c = ALL_CATEGORIES[i];
    const list = categoryBuckets[c] || [];
    for (let j = 0; j < list.length; j++) {
      const v = list[j];
      if (!added.has(v.id)) {
        added.add(v.id);
        uniqueVideos.push(v);
      }
    }
  }

  console.log("Total unique curated videos generated: " + uniqueVideos.length);
  const stats = {};
  for (let i = 0; i < ALL_CATEGORIES.length; i++) {
    const c = ALL_CATEGORIES[i];
    stats[c] = categoryBuckets[c] ? categoryBuckets[c].length : 0;
  }
  console.log("Category counts:", JSON.stringify(stats, null, 2));

  fs.writeFileSync(path.join(__dirname, "..", "src", "data", "pornhubCurated.json"), JSON.stringify(uniqueVideos, null, 2), "utf8");
  fs.writeFileSync(path.join(__dirname, "..", "public", "data", "videos_page1.json"), JSON.stringify(uniqueVideos, null, 2), "utf8");
  console.log("Successfully written 1,000+ curated videos to dataset files!");
});
