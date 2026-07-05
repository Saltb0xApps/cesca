// Margins backend.
//
// Every document is stored as ONE portable markdown file at data/<id>.md.
// The essay text lives as clean markdown in the body so any editor can read it.
// App metadata (annotations, block ids/order, folder, dates) is tucked into an
// HTML comment header at the top of the file so it never pollutes the prose.
//
// Versions are full markdown snapshots under data/versions/<id>/<timestamp>.md.
// Folders are a small JSON registry at data/folders.json.

import express from "express";
import os from "node:os";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
// DATA_DIR is configurable so a cloud host can point it at a persistent volume.
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(ROOT, "data");
const VERSIONS_DIR = path.join(DATA_DIR, "versions");
const FOLDERS_FILE = path.join(DATA_DIR, "folders.json");
const STATS_FILE = path.join(DATA_DIR, "stats.json");
const DIST_DIR = path.join(ROOT, "dist");

const PORT = process.env.PORT || 3001;
const PASSWORD = process.env.APP_PASSWORD; // optional; protects everything when set
const META_OPEN = "<!--margins";
const META_CLOSE = "-->";

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(VERSIONS_DIR, { recursive: true });

const app = express();

// Optional password gate (HTTP Basic). Set APP_PASSWORD to require it — the
// browser will prompt once and remember it. Without it, the app is open.
if (PASSWORD) {
  app.use((req, res, next) => {
    const hdr = req.headers.authorization || "";
    const [scheme, encoded] = hdr.split(" ");
    if (scheme === "Basic" && encoded) {
      const pass = Buffer.from(encoded, "base64").toString().split(":")[1];
      if (pass === PASSWORD) return next();
    }
    res.set("WWW-Authenticate", 'Basic realm="Margins"');
    res.status(401).send("Authentication required");
  });
}

app.use(express.json({ limit: "10mb" }));

/* ----------------------------- helpers ----------------------------------- */

function uid(prefix = "") {
  return (
    prefix +
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 7)
  );
}

function nowISO() {
  return new Date().toISOString();
}

// Serialize a document object into the on-disk markdown file.
function serializeDoc(doc) {
  const meta = {
    id: doc.id,
    title: doc.title,
    folderId: doc.folderId ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    blocks: (doc.blocks || []).map((b) => ({ id: b.id, type: b.type || "p" })),
    annotations: doc.annotations || { highlights: [], notes: [], arrows: [] },
  };
  if (doc.format) meta.format = doc.format;
  if (doc.versionLabel !== undefined) meta.versionLabel = doc.versionLabel;
  const body = (doc.blocks || []).map((b) => b.text ?? "").join("\n\n");
  return `${META_OPEN}\n${JSON.stringify(meta, null, 2)}\n${META_CLOSE}\n\n${body}\n`;
}

// Parse an on-disk markdown file back into a document object.
function parseDoc(raw) {
  let meta = null;
  let body = raw;
  if (raw.startsWith(META_OPEN)) {
    const end = raw.indexOf(META_CLOSE);
    if (end !== -1) {
      const json = raw.slice(META_OPEN.length, end).trim();
      try {
        meta = JSON.parse(json);
      } catch {
        meta = null;
      }
      body = raw.slice(end + META_CLOSE.length).replace(/^\s*\n/, "");
    }
  }
  meta = meta || {};
  const texts = splitBlocks(body);
  const metaBlocks = Array.isArray(meta.blocks) ? meta.blocks : [];
  const blocks = texts.map((text, i) => ({
    id: (metaBlocks[i] && metaBlocks[i].id) || uid("b"),
    type: (metaBlocks[i] && metaBlocks[i].type) || guessType(text),
    text,
  }));
  return {
    id: meta.id,
    title: meta.title || "Untitled",
    folderId: meta.folderId ?? null,
    createdAt: meta.createdAt || nowISO(),
    updatedAt: meta.updatedAt || nowISO(),
    blocks,
    annotations: meta.annotations || { highlights: [], notes: [], arrows: [] },
    format: meta.format,
    versionLabel: meta.versionLabel,
  };
}

function splitBlocks(body) {
  const trimmed = body.replace(/\s+$/, "");
  if (!trimmed.trim()) return [];
  return trimmed.split(/\n{2,}/).map((s) => s.replace(/\s+$/, ""));
}

function guessType(text) {
  if (/^#{1,6}\s/.test(text)) return "h";
  if (/^>\s/.test(text)) return "quote";
  if (/^([-*]|\d+\.)\s/m.test(text)) return "list";
  return "p";
}

function excerptOf(doc) {
  const firstProse = (doc.blocks || []).find(
    (b) => b.type === "p" && b.text.trim()
  );
  const raw = (firstProse?.text || doc.blocks?.[0]?.text || "").replace(
    /[#>*_`>-]/g,
    ""
  );
  return raw.trim().slice(0, 220);
}

function wordCount(doc) {
  return (doc.blocks || [])
    .map((b) => b.text.trim().split(/\s+/).filter(Boolean).length)
    .reduce((a, b) => a + b, 0);
}

function docPath(id) {
  return path.join(DATA_DIR, `${id}.md`);
}

async function readDoc(id) {
  const raw = await fsp.readFile(docPath(id), "utf8");
  const doc = parseDoc(raw);
  doc.id = id;
  return doc;
}

async function writeDoc(doc) {
  await fsp.writeFile(docPath(doc.id), serializeDoc(doc), "utf8");
}

async function listDocIds() {
  const files = await fsp.readdir(DATA_DIR);
  return files
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.slice(0, -3));
}

async function readFolders() {
  try {
    return JSON.parse(await fsp.readFile(FOLDERS_FILE, "utf8"));
  } catch {
    return [];
  }
}

async function writeFolders(folders) {
  await fsp.writeFile(FOLDERS_FILE, JSON.stringify(folders, null, 2), "utf8");
}

/* --------------------------- writing stats ------------------------------- */
// Tracks a daily writing goal. `days` maps YYYY-MM-DD -> words added that day
// (positive additions only). `docCounts` remembers each doc's last-seen word
// count so we can measure the delta on the next save.

function dayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

async function readStats() {
  try {
    const s = JSON.parse(await fsp.readFile(STATS_FILE, "utf8"));
    return { goal: 500, days: {}, docCounts: {}, ...s };
  } catch {
    return { goal: 500, days: {}, docCounts: {} };
  }
}

async function writeStats(stats) {
  await fsp.writeFile(STATS_FILE, JSON.stringify(stats, null, 2), "utf8");
}

// Record a save: add positive word deltas to today's tally. When `baseline` is
// true we only set the doc's remembered count (used for imports / seeds) so the
// existing words don't count as "written today".
async function recordSave(id, wc, baseline = false) {
  const stats = await readStats();
  const prev = stats.docCounts[id] ?? 0;
  if (!baseline && wc > prev) {
    const k = dayKey();
    stats.days[k] = (stats.days[k] || 0) + (wc - prev);
  }
  stats.docCounts[id] = wc;
  await writeStats(stats);
}

function computeStreak(stats) {
  const goal = stats.goal || 1;
  let streak = 0;
  const d = new Date();
  const todayMet = (stats.days[dayKey(d)] || 0) >= goal;
  if (!todayMet) d.setDate(d.getDate() - 1); // today unfinished: count up to yesterday
  while ((stats.days[dayKey(d)] || 0) >= goal) {
    streak += 1;
    d.setDate(d.getDate() - 1);
  }
  return { streak, todayMet };
}

/* ------------------------------- stats API ------------------------------- */

app.get("/api/stats", async (_req, res) => {
  const stats = await readStats();
  const { streak, todayMet } = computeStreak(stats);
  // last 14 days for a small sparkline
  const recent = [];
  const d = new Date();
  d.setDate(d.getDate() - 13);
  for (let i = 0; i < 14; i++) {
    const k = dayKey(d);
    recent.push({ date: k, words: stats.days[k] || 0 });
    d.setDate(d.getDate() + 1);
  }
  res.json({
    goal: stats.goal || 500,
    today: stats.days[dayKey()] || 0,
    streak,
    todayMet,
    recent,
  });
});

app.put("/api/stats", async (req, res) => {
  const stats = await readStats();
  const g = Number(req.body?.goal);
  if (Number.isFinite(g) && g > 0) stats.goal = Math.round(g);
  await writeStats(stats);
  const { streak, todayMet } = computeStreak(stats);
  res.json({ goal: stats.goal, today: stats.days[dayKey()] || 0, streak, todayMet });
});

/* ------------------------------ folders ---------------------------------- */

app.get("/api/folders", async (_req, res) => {
  res.json(await readFolders());
});

app.post("/api/folders", async (req, res) => {
  const folders = await readFolders();
  const folder = {
    id: uid("f"),
    name: (req.body?.name || "New folder").trim() || "New folder",
    createdAt: nowISO(),
  };
  folders.push(folder);
  await writeFolders(folders);
  res.json(folder);
});

app.patch("/api/folders/:id", async (req, res) => {
  const folders = await readFolders();
  const f = folders.find((x) => x.id === req.params.id);
  if (!f) return res.status(404).json({ error: "not found" });
  if (typeof req.body?.name === "string") f.name = req.body.name.trim() || f.name;
  await writeFolders(folders);
  res.json(f);
});

app.delete("/api/folders/:id", async (req, res) => {
  let folders = await readFolders();
  folders = folders.filter((x) => x.id !== req.params.id);
  await writeFolders(folders);
  // Detach documents that lived in this folder.
  for (const id of await listDocIds()) {
    const doc = await readDoc(id);
    if (doc.folderId === req.params.id) {
      doc.folderId = null;
      await writeDoc(doc);
    }
  }
  res.json({ ok: true });
});

/* ------------------------------ documents -------------------------------- */

// Summaries for the landing page.
app.get("/api/docs", async (_req, res) => {
  const ids = await listDocIds();
  const docs = [];
  for (const id of ids) {
    try {
      const doc = await readDoc(id);
      docs.push({
        id: doc.id,
        title: doc.title,
        folderId: doc.folderId,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        excerpt: excerptOf(doc),
        wordCount: wordCount(doc),
        annotationCount:
          (doc.annotations?.highlights?.length || 0) +
          (doc.annotations?.notes?.length || 0),
      });
    } catch {
      /* skip unreadable */
    }
  }
  res.json(docs);
});

app.post("/api/docs", async (req, res) => {
  const id = uid("doc");
  const doc = {
    id,
    title: (req.body?.title || "Untitled essay").trim() || "Untitled essay",
    folderId: req.body?.folderId ?? null,
    createdAt: nowISO(),
    updatedAt: nowISO(),
    blocks: [{ id: uid("b"), type: "p", text: "" }],
    annotations: { highlights: [], notes: [], arrows: [] },
  };
  await writeDoc(doc);
  await recordSave(id, 0, true); // start the counter at zero for a fresh essay
  res.json(doc);
});

app.get("/api/docs/:id", async (req, res) => {
  try {
    res.json(await readDoc(req.params.id));
  } catch {
    res.status(404).json({ error: "not found" });
  }
});

app.put("/api/docs/:id", async (req, res) => {
  let existing;
  try {
    existing = await readDoc(req.params.id);
  } catch {
    return res.status(404).json({ error: "not found" });
  }
  const b = req.body || {};
  const doc = {
    id: req.params.id,
    title: (b.title ?? existing.title) || "Untitled",
    folderId: b.folderId === undefined ? existing.folderId : b.folderId,
    createdAt: existing.createdAt,
    updatedAt: nowISO(),
    blocks: Array.isArray(b.blocks) ? b.blocks : existing.blocks,
    annotations: b.annotations ?? existing.annotations,
    format: b.format === undefined ? existing.format : b.format,
  };
  await writeDoc(doc);
  await recordSave(req.params.id, wordCount(doc), b.baseline === true);
  res.json(doc);
});

app.delete("/api/docs/:id", async (req, res) => {
  try {
    await fsp.unlink(docPath(req.params.id));
  } catch {
    /* ignore */
  }
  try {
    await fsp.rm(path.join(VERSIONS_DIR, req.params.id), {
      recursive: true,
      force: true,
    });
  } catch {
    /* ignore */
  }
  try {
    const stats = await readStats();
    delete stats.docCounts[req.params.id];
    await writeStats(stats);
  } catch {
    /* ignore */
  }
  res.json({ ok: true });
});

/* ------------------------------ versions --------------------------------- */

function versionDir(id) {
  return path.join(VERSIONS_DIR, id);
}

app.get("/api/docs/:id/versions", async (req, res) => {
  const dir = versionDir(req.params.id);
  let files = [];
  try {
    files = await fsp.readdir(dir);
  } catch {
    return res.json([]);
  }
  const versions = [];
  for (const f of files.filter((x) => x.endsWith(".md"))) {
    const raw = await fsp.readFile(path.join(dir, f), "utf8");
    const doc = parseDoc(raw);
    const ts = f.replace(/\.md$/, "");
    versions.push({
      ts,
      savedAt: doc.updatedAt,
      label: doc.versionLabel || "",
      wordCount: wordCount(doc),
    });
  }
  versions.sort((a, b) => (a.ts < b.ts ? 1 : -1));
  res.json(versions);
});

app.post("/api/docs/:id/versions", async (req, res) => {
  let doc;
  try {
    doc = await readDoc(req.params.id);
  } catch {
    return res.status(404).json({ error: "not found" });
  }
  const dir = versionDir(req.params.id);
  await fsp.mkdir(dir, { recursive: true });
  const ts = nowISO().replace(/[:.]/g, "-");
  const snapshot = { ...doc, versionLabel: req.body?.label || "" };
  await fsp.writeFile(path.join(dir, `${ts}.md`), serializeDoc(snapshot), "utf8");
  res.json({ ts, savedAt: doc.updatedAt, label: snapshot.versionLabel });
});

app.get("/api/docs/:id/versions/:ts", async (req, res) => {
  try {
    const raw = await fsp.readFile(
      path.join(versionDir(req.params.id), `${req.params.ts}.md`),
      "utf8"
    );
    res.json(parseDoc(raw));
  } catch {
    res.status(404).json({ error: "not found" });
  }
});

app.post("/api/docs/:id/versions/:ts/restore", async (req, res) => {
  try {
    const raw = await fsp.readFile(
      path.join(versionDir(req.params.id), `${req.params.ts}.md`),
      "utf8"
    );
    const snapshot = parseDoc(raw);
    snapshot.id = req.params.id;
    snapshot.updatedAt = nowISO();
    delete snapshot.versionLabel;
    await writeDoc(snapshot);
    res.json(snapshot);
  } catch {
    res.status(404).json({ error: "not found" });
  }
});

/* --------------------- static (production build) ------------------------- */

if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.get("*", (_req, res) => res.sendFile(path.join(DIST_DIR, "index.html")));
}

/* ------------------------- first-run welcome ----------------------------- */

async function seedIfEmpty() {
  try {
    const ids = await listDocIds();
    if (ids.length) return;
    const id = uid("doc");
    const mk = (type, text) => ({ id: uid("b"), type, text });
    const doc = {
      id,
      title: "Welcome to Margins",
      folderId: null,
      createdAt: nowISO(),
      updatedAt: nowISO(),
      blocks: [
        mk("h", "# Welcome to Margins"),
        mk(
          "p",
          "This is your writing studio. Drafts live here as plain, portable markdown files — one per essay — so your words are always yours."
        ),
        mk("h", "## Two modes"),
        mk(
          "p",
          "Use **Write** mode for clean, distraction-free drafting. Switch to **Edit** mode to mark a piece up like homework: select any text to highlight it or pin a margin note, drag the handle to reorder paragraphs, and draw arrows where things should move."
        ),
        mk("h", "## A few shortcuts"),
        mk(
          "p",
          "Press Cmd-slash any time to see every shortcut. Cmd-E switches modes, Cmd-S saves a version, and Cmd-comma opens formatting — typeface, size, spacing, and page width, set per essay."
        ),
        mk(
          "p",
          "Delete this note whenever you like, and start your first essay from the library."
        ),
      ],
      annotations: { highlights: [], notes: [], arrows: [] },
    };
    await writeDoc(doc);
    // Baseline the welcome essay so editing it doesn't count as words written today.
    await recordSave(id, wordCount(doc), true);
    console.log("  Seeded a welcome essay.");
  } catch (e) {
    console.warn("  Could not seed welcome essay:", e.message);
  }
}

/* --------------------------------- boot ---------------------------------- */

// Bind to 0.0.0.0 so other devices (phone / iPad) on the same network can reach it.
app.listen(PORT, "0.0.0.0", async () => {
  await seedIfEmpty();
  const nets = os.networkInterfaces();
  const lan = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === "IPv4" && !net.internal) lan.push(net.address);
    }
  }
  console.log(`\n  Margins server running:`);
  console.log(`    Local:   http://localhost:${PORT}`);
  for (const ip of lan) console.log(`    Network: http://${ip}:${PORT}`);
  console.log(
    `\n  In dev, open the Vite URL instead (npm run dev prints it). ` +
      `On your phone/iPad use the Network address.\n`
  );
});
