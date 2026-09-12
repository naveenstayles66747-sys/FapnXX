import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
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

// Global SQLite FTS5 connection
let sqliteDb: Database.Database | null = null;
const sqliteDbPath = path.join(process.cwd(), "server", "data", "videos_fts.db");

function getSqliteDb(): Database.Database | null {
  if (!sqliteDb && fs.existsSync(sqliteDbPath)) {
    try {
      sqliteDb = new Database(sqliteDbPath, { readonly: true, fileMustExist: true });
      sqliteDb.pragma("cache_size = 1000000");
    } catch (e) {
      console.warn("Failed to open SQLite FTS5 database:", e);
      sqliteDb = null;
    }
  }
  return sqliteDb;
}

export const pornhubService = {
  getDbStatus: () => {
    const dbExists = fs.existsSync(sqliteDbPath);
    let sizeBytes = 0;
    if (dbExists) {
      try {
        const stats = fs.statSync(sqliteDbPath);
        sizeBytes = stats.size;
      } catch {}
    }

    const csvPath = path.join(process.cwd(), "affiliate-webmaster", "pornhub.com-db", "pornhub.com-db.csv");
    const csvExists = fs.existsSync(csvPath);

    return {
      available: dbExists || csvExists,
      sqliteIndexed: dbExists,
      sqliteSizeMb: dbExists ? (sizeBytes / (1024 * 1024)).toFixed(2) + " MB" : "0 MB",
      csvAvailable: csvExists,
    };
  },

  queryVideos: async (query: PornhubImportQuery = {}) => {
    const limit = Math.min(query.limit || 24, 100);
    const minViews = query.minViews !== undefined ? query.minViews : 1000;
    const search = (query.searchQuery || "").trim();
    const category = (query.category || "").trim();
    const atsCode = (query.atsCode || "").trim();

    const db = getSqliteDb();

    // ── 1. FAST SQLITE FTS5 SEARCH (Sub-millisecond) ──
    if (db) {
      try {
        let sql = "SELECT * FROM videos_fts";
        const params: any[] = [];
        const clauses: string[] = [];

        // Full Text Query
        if (search) {
          const sanitized = search
            .replace(/["'*^:?]/g, " ")
            .split(/\s+/)
            .filter((w) => w.length > 0)
            .map((w) => `"${w}"*`)
            .join(" ");

          if (sanitized) {
            clauses.push("videos_fts MATCH ?");
            params.push(sanitized);
          }
        } else if (category && category !== "all" && category !== "trending") {
          clauses.push("videos_fts MATCH ?");
          params.push(`"${category}"*`);
        }

        if (clauses.length > 0) {
          sql += " WHERE " + clauses.join(" AND ");
        }

        sql += " LIMIT ?";
        params.push(limit);

        const rows = db.prepare(sql).all(...params) as any[];

        const matched = rows.map((r: any) => {
          const videoId = r.id;
          const embedUrl = atsCode
            ? `https://www.pornhub.com/embed/${videoId}?ats=${encodeURIComponent(atsCode)}`
            : `https://www.pornhub.com/embed/${videoId}`;

          let thumbUrl = r.thumb || "";
          if (thumbUrl && !thumbUrl.startsWith("http")) {
            thumbUrl = `https://ei.phncdn.com/videos/${thumbUrl}`;
          }

          const catInfo = mapCategory(r.categories || "", "");
          const viewsNum = parseInt(r.views, 10) || 0;
          const durationNum = parseInt(r.duration, 10) || 0;
          const ratingNum = parseInt(r.rating, 10) || 85;

          const models = r.performers
            ? r.performers.split(";").map((s: string) => s.trim()).filter(Boolean)
            : [];

          return {
            id: `ph_${videoId}`,
            title: r.title,
            description: `${r.title} - Free full HD video streaming on FapnXX.`,
            videoUrl: embedUrl,
            streamUrl: embedUrl,
            embedUrl: embedUrl,
            thumbnail: thumbUrl,
            views: formatViews(viewsNum),
            viewsCount: viewsNum,
            likes: Math.round((viewsNum * ratingNum) / 1000),
            duration: formatDuration(durationNum),
            durationSeconds: durationNum,
            isPornhubEmbed: true,
            pornhubEmbedId: videoId,
            tags: (r.categories || "").split(";").map((s: string) => s.trim()).filter(Boolean),
            categories: [catInfo.label],
            categoryId: catInfo.id,
            category: catInfo.id,
            categoryLabel: catInfo.label,
            performerName: models.length > 0 ? models[0] : "",
            modelsActors: models,
            models_actors: models,
            rating: ratingNum,
            ratingPercent: ratingNum,
            createdAt: new Date().toISOString(),
          };
        });

        if (matched.length > 0) {
          return {
            totalFound: matched.length,
            count: matched.length,
            source: "sqlite_fts5",
            videos: matched,
          };
        }
      } catch (err) {
        console.warn("SQLite FTS5 query warning, falling back to CSV if present:", err);
      }
    }

    // ── 2. FALLBACK TO DIRECT CSV SCAN ──
    const csvPath = path.join(process.cwd(), "affiliate-webmaster", "pornhub.com-db", "pornhub.com-db.csv");
    if (!fs.existsSync(csvPath)) {
      return { totalFound: 0, count: 0, source: "none", videos: [] };
    }

    const matched: any[] = [];
    const seenIds = new Set<string>();

    const fd = fs.openSync(csvPath, "r");
    const BUFFER_SIZE = 1024 * 1024 * 8; // 8MB buffer
    const buf = Buffer.alloc(BUFFER_SIZE);
    let bytesRead = 0;
    let remainder = "";
    let scannedRows = 0;
    const maxRowsToScan = 500000;

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

          const tagsRaw = (cols[4] || "").toLowerCase();
          const catRaw = (cols[5] || "").toLowerCase();
          const modelsRaw = (cols[6] || "").toLowerCase();

          if (search) {
            const matchesSearch =
              title.toLowerCase().includes(search) ||
              tagsRaw.includes(search) ||
              catRaw.includes(search) ||
              modelsRaw.includes(search);
            if (!matchesSearch) continue;
          }

          if (category && category !== "all" && category !== "trending") {
            const matchesCat = catRaw.includes(category) || tagsRaw.includes(category);
            if (!matchesCat) continue;
          }

          let videoId = "";
          const matchEmbed = rawEmbed.match(/embed\/([a-zA-Z0-9_-]+)/);
          if (matchEmbed) {
            videoId = matchEmbed[1];
          } else {
            videoId = rawEmbed.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32);
          }

          if (seenIds.has(videoId)) continue;
          seenIds.add(videoId);

          const thumb = (cols[11] || cols[1] || "").trim();
          const durationSeconds = parseInt(cols[7], 10) || 0;
          const ratingUp = parseInt(cols[9], 10) || 0;
          const ratingDown = parseInt(cols[10], 10) || 0;
          const totalRating = ratingUp + ratingDown;
          const ratingPercent = totalRating > 0 ? Math.round((ratingUp / totalRating) * 100) : 85;

          const finalEmbedUrl = atsCode
            ? `https://www.pornhub.com/embed/${videoId}?ats=${encodeURIComponent(atsCode)}`
            : `https://www.pornhub.com/embed/${videoId}`;

          const catInfo = mapCategory(catRaw, tagsRaw);

          matched.push({
            id: `ph_${videoId}`,
            title,
            description: `${title} - Free streaming on FapnXX.`,
            videoUrl: finalEmbedUrl,
            streamUrl: finalEmbedUrl,
            embedUrl: finalEmbedUrl,
            thumbnail: thumb,
            views: formatViews(viewsCount),
            viewsCount,
            likes: ratingUp,
            duration: formatDuration(durationSeconds),
            durationSeconds,
            isPornhubEmbed: true,
            pornhubEmbedId: videoId,
            tags: tagsRaw.split(";").filter(Boolean),
            categories: [catInfo.label],
            categoryId: catInfo.id,
            category: catInfo.id,
            categoryLabel: catInfo.label,
            performerName: (cols[6] || "").split(";")[0]?.trim() || "",
            modelsActors: (cols[6] || "").split(";").map((s) => s.trim()).filter(Boolean),
            rating: ratingPercent,
            ratingPercent,
            createdAt: new Date().toISOString(),
          });

          if (matched.length >= limit) break;
        }

        if (matched.length >= limit || scannedRows >= maxRowsToScan) break;
      }
    } finally {
      fs.closeSync(fd);
    }

    return {
      totalFound: matched.length,
      count: matched.length,
      scannedRows,
      source: "csv_scan",
      videos: matched,
    };
  },

  importToFirestore: async (videos: any[]) => {
    if (!videos || videos.length === 0) return { success: false, imported: 0 };
    const batch = adminDb.batch();
    let count = 0;

    for (const v of videos) {
      const ref = adminDb.collection("videos").doc(v.id);
      batch.set(ref, {
        ...v,
        importedAt: new Date().toISOString(),
        published: true,
        source: "pornhub_affiliate",
      }, { merge: true });
      count++;
    }

    await batch.commit();
    return { success: true, imported: count };
  },
};
