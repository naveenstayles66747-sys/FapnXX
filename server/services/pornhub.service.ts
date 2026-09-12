import fs from "fs";
import path from "path";
import readline from "readline";
import { adminDb } from "../firebase-admin";

export interface PornhubImportQuery {
  category?: string;
  minViews?: number;
  limit?: number;
  searchQuery?: string;
  atsCode?: string;
  autoPublish?: boolean;
}

export function formatDuration(secondsNum: number): string {
  if (isNaN(secondsNum) || secondsNum <= 0) return "05:00";
  const mins = Math.floor(secondsNum / 60);
  const secs = secondsNum % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function formatViews(viewsNum: number): string {
  if (isNaN(viewsNum) || viewsNum <= 0) return "1K";
  if (viewsNum >= 1000000) return `${(viewsNum / 1000000).toFixed(1).replace(/\.0$/, "")}M`;
  if (viewsNum >= 1000) return `${(viewsNum / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return viewsNum.toString();
}

export function mapCategory(catRaw: string, tagsRaw: string): { id: string; label: string } {
  const combined = `${catRaw} ${tagsRaw}`.toLowerCase();
  if (combined.includes("amateur")) return { id: "amateur", label: "Amateur" };
  if (combined.includes("milf")) return { id: "milf", label: "MILF" };
  if (combined.includes("teen") || combined.includes("18-25")) return { id: "teen", label: "Teen (18+)" };
  if (combined.includes("anal")) return { id: "anal", label: "Anal" };
  if (combined.includes("lesbian")) return { id: "lesbian", label: "Lesbian" };
  if (combined.includes("gay")) return { id: "gay", label: "Gay" };
  if (combined.includes("transgender") || combined.includes("shemale") || combined.includes("tranny")) return { id: "transgender", label: "Transgender / Shemale" };
  if (combined.includes("pov")) return { id: "pov", label: "POV" };
  if (combined.includes("big tits") || combined.includes("big-tits") || combined.includes("tits") || combined.includes("boobs")) return { id: "big-tits", label: "Big Tits" };
  if (combined.includes("big ass") || combined.includes("big-ass") || combined.includes("booty")) return { id: "big-ass", label: "Big Ass" };
  if (combined.includes("blowjob") || combined.includes("deepthroat") || combined.includes("sucking")) return { id: "blowjob", label: "Blowjob & Oral" };
  if (combined.includes("creampie") || combined.includes("cumshot") || combined.includes("jizz")) return { id: "creampie", label: "Creampie" };
  if (combined.includes("threesome") || combined.includes("foursome") || combined.includes("orgy") || combined.includes("group")) return { id: "threesome", label: "Threesome & Groups" };
  if (combined.includes("interracial") || combined.includes("bbc")) return { id: "interracial", label: "Interracial" };
  if (combined.includes("ebony")) return { id: "ebony", label: "Ebony" };
  if (combined.includes("latina") || combined.includes("brazilian")) return { id: "latina", label: "Latina" };
  if (combined.includes("desi") || combined.includes("indian") || combined.includes("hindi") || combined.includes("bhabhi")) return { id: "desi", label: "Desi" };
  if (combined.includes("asian") || combined.includes("japanese") || combined.includes("korean")) return { id: "asian", label: "Asian" };
  if (combined.includes("hentai") || combined.includes("anime") || combined.includes("3d")) return { id: "hentai", label: "Hentai" };
  if (combined.includes("vr")) return { id: "vr", label: "VR" };
  if (combined.includes("hardcore") || combined.includes("rough")) return { id: "hardcore", label: "Hardcore" };
  if (combined.includes("fetish") || combined.includes("bdsm")) return { id: "fetish", label: "Fetish & BDSM" };
  if (combined.includes("masturbation") || combined.includes("solo")) return { id: "masturbation", label: "Masturbation & Solo" };
  if (combined.includes("public") || combined.includes("outdoor")) return { id: "public", label: "Public & Outdoor" };
  if (combined.includes("mature") || combined.includes("vintage")) return { id: "mature", label: "Mature & Vintage" };
  return { id: "trending", label: "Trending" };
}

export const pornhubService = {
  getDbStatus: () => {
    const csvPath = path.join(process.cwd(), "affiliate-webmaster", "pornhub.com-db", "pornhub.com-db.csv");
    const exists = fs.existsSync(csvPath);
    let sizeBytes = 0;
    if (exists) {
      try {
        const stats = fs.statSync(csvPath);
        sizeBytes = stats.size;
      } catch {}
    }

    return {
      available: exists,
      path: csvPath,
      sizeBytes,
      sizeGb: exists ? (sizeBytes / (1024 * 1024 * 1024)).toFixed(2) + " GB" : "0 GB",
    };
  },

  queryVideos: async (query: PornhubImportQuery = {}) => {
    const csvPath = path.join(process.cwd(), "affiliate-webmaster", "pornhub.com-db", "pornhub.com-db.csv");
    if (!fs.existsSync(csvPath)) {
      throw new Error("Pornhub database dump CSV not found at affiliate-webmaster/pornhub.com-db/pornhub.com-db.csv");
    }

    const limit = Math.min(query.limit || 24, 100);
    const minViews = query.minViews !== undefined ? query.minViews : 5000;
    const targetCategory = (query.category || "").toLowerCase().trim();
    const search = (query.searchQuery || "").toLowerCase().trim();
    const atsCode = (query.atsCode || "").trim();

    const matched: any[] = [];
    const seenIds = new Set<string>();

    const fd = fs.openSync(csvPath, "r");
    const BUFFER_SIZE = 1024 * 1024 * 8; // 8MB buffer
    const buf = Buffer.alloc(BUFFER_SIZE);
    let bytesRead = 0;
    let remainder = "";
    let scannedRows = 0;
    const maxRowsToScan = 800000; // Search across up to 800,000 deep rows per instant query

    try {
      while ((bytesRead = fs.readSync(fd, buf, 0, BUFFER_SIZE, null)) > 0) {
        const chunkStr = remainder + buf.toString("utf8", 0, bytesRead);
        const lines = chunkStr.split("\n");
        remainder = lines.pop() || "";

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          scannedRows++;
          if (!line || !line.includes("|")) continue;
          const cols = line.split("|");
          if (cols.length < 10) continue;

          const rawEmbed = (cols[0] || "").trim();
          const title = (cols[3] || "").trim();
          if (!rawEmbed || !title) continue;

          const viewsCount = parseInt(cols[8], 10) || 0;
          if (viewsCount < minViews) continue;

          const tagsStr = cols[4] || "";
          const catStr = cols[5] || "";
          const pornstarsStr = cols[6] || "";

          if (search) {
            const fullText = `${title} ${tagsStr} ${catStr} ${pornstarsStr}`.toLowerCase();
            if (!fullText.includes(search)) continue;
          }

          const catMapping = mapCategory(catStr, tagsStr);
          if (targetCategory && targetCategory !== "all" && catMapping.id !== targetCategory) {
            continue;
          }

          const keyMatch = rawEmbed.match(/\/embed\/([a-zA-Z0-9_-]+)/i) || rawEmbed.match(/viewkey=([a-zA-Z0-9_-]+)/i);
          const vKey = keyMatch ? keyMatch[1] : "";
          if (!vKey) continue;

          const vidId = `ph-${vKey}`;
          if (seenIds.has(vidId)) continue;
          seenIds.add(vidId);

          let cleanEmbed = `https://www.pornhub.org/embed/${vKey}`;
          if (atsCode) {
            cleanEmbed += cleanEmbed.includes("?") ? `&ats=${atsCode}` : `?ats=${atsCode}`;
          }

          const durationSec = parseInt(cols[7], 10) || 450;
          const upvotes = parseInt(cols[9], 10) || Math.round(viewsCount * 0.04);
          const downvotes = parseInt(cols[10], 10) || 0;
          const totalVotes = upvotes + downvotes;
          const ratingPct = totalVotes > 0 ? Math.round((upvotes / totalVotes) * 100) : 95;

          const primaryThumb = cols[11] && cols[11].startsWith("http") ? cols[11].trim() : (cols[1] || "").trim();
          if (!primaryThumb || !primaryThumb.startsWith("http")) continue;

          const framePreviews = (cols[12] || cols[2] || "").split(";").filter((f) => f && f.startsWith("http"));
          const actors = pornstarsStr.split(";").map((a) => a.trim()).filter(Boolean);
          const performerName = actors.length > 0 ? actors[0] : `${catMapping.label} Verified`;

          const item = {
            id: vidId,
            title,
            category: catMapping.id,
            categoryLabel: catMapping.label,
            categories: [catMapping.id, ...catStr.split(";").map((c) => c.trim().toLowerCase()).filter(Boolean)].slice(0, 5),
            tags: Array.from(new Set([...tagsStr.split(";").map((t) => t.trim()).filter(Boolean), catMapping.label])).slice(0, 12),
            modelsActors: actors.length > 0 ? actors : undefined,
            models_actors: actors.length > 0 ? actors : undefined,
            performers: actors.length > 0 ? actors : undefined,
            performerName,
            performerAvatar: primaryThumb,
            channelName: "Pornhub Verified",
            thumbnail: primaryThumb,
            thumbnailUrl: primaryThumb,
            previewFrames: framePreviews.length > 0 ? framePreviews : undefined,
            previewMp4Url: framePreviews.length > 0 ? framePreviews[Math.min(4, framePreviews.length - 1)] : undefined,
            duration: formatDuration(durationSec),
            quality: durationSec > 600 || viewsCount > 500000 ? "4K" : "HD",
            views: `${formatViews(viewsCount)} views`,
            viewsCount,
            likesCount: upvotes,
            rating: `${ratingPct}%`,
            timeAgo: "Trending now",
            createdAt: new Date().toISOString(),
            description: `Watch ${title} in 4K Ultra HD on FapnXX. Featuring top verified adult performers.`,
            embedUrl: cleanEmbed,
            isEmbed: true,
            isExclusive: viewsCount > 1000000,
            isNew: true,
            orientation: catMapping.id === "lesbian" ? "lesbian" : "straight",
            contentPreference: catMapping.id === "lesbian" ? "lesbian" : "straight",
            sourceWebsite: "Pornhub",
            sourceWebsiteUrl: "https://www.pornhub.com",
          };

          matched.push(item);
          if (matched.length >= limit) break;
        }

        if (matched.length >= limit || scannedRows >= maxRowsToScan) break;
      }
    } finally {
      fs.closeSync(fd);
    }

    // Auto publish directly to Firestore if requested
    if (query.autoPublish && matched.length > 0 && adminDb) {
      try {
        const batch = adminDb.batch();
        matched.forEach((v) => {
          const ref = adminDb.collection("videos").doc(v.id);
          batch.set(ref, v, { merge: true });
        });
        await batch.commit();
      } catch (err: any) {
        console.warn("⚠️ [Firestore Sync] Auto-publish notice:", err?.message);
      }
    }

    return {
      count: matched.length,
      scannedRows,
      autoPublished: Boolean(query.autoPublish),
      videos: matched,
    };
  },
};
