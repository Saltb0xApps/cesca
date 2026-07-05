import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api";
import type { DocSummary, Folder } from "../types";
import { timeAgo, dateLabel } from "../lib/format";
import { splitText, guessType, uid } from "../lib/text";
import { GoalCard } from "./GoalCard";

type SortKey = "edited" | "added";
type ViewKey = "gallery" | "list";

export function Landing({ onOpen }: { onOpen: (id: string) => void }) {
  const [docs, setDocs] = useState<DocSummary[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewKey>(
    (localStorage.getItem("m.view") as ViewKey) || "gallery"
  );
  const [sort, setSort] = useState<SortKey>(
    (localStorage.getItem("m.sort") as SortKey) || "edited"
  );
  const [folderId, setFolderId] = useState<string | "all" | "unfiled">("all");
  const [query, setQuery] = useState("");
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(
    null
  );
  const fileInput = useRef<HTMLInputElement>(null);

  async function refresh() {
    const [d, f] = await Promise.all([api.listDocs(), api.listFolders()]);
    setDocs(d);
    setFolders(f);
    setLoading(false);
  }
  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => localStorage.setItem("m.view", view), [view]);
  useEffect(() => localStorage.setItem("m.sort", sort), [sort]);

  const filtered = useMemo(() => {
    let list = docs.slice();
    if (folderId === "unfiled") list = list.filter((d) => !d.folderId);
    else if (folderId !== "all") list = list.filter((d) => d.folderId === folderId);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (d) =>
          d.title.toLowerCase().includes(q) || d.excerpt.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      const ka = sort === "edited" ? a.updatedAt : a.createdAt;
      const kb = sort === "edited" ? b.updatedAt : b.createdAt;
      return ka < kb ? 1 : -1;
    });
    return list;
  }, [docs, folderId, query, sort]);

  const totalWords = useMemo(
    () => filtered.reduce((sum, d) => sum + (d.wordCount || 0), 0),
    [filtered]
  );

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: docs.length, unfiled: 0 };
    for (const d of docs) {
      if (!d.folderId) map.unfiled++;
      else map[d.folderId] = (map[d.folderId] || 0) + 1;
    }
    return map;
  }, [docs]);

  async function newDoc() {
    const fid = folderId === "all" || folderId === "unfiled" ? null : folderId;
    const doc = await api.createDoc("Untitled essay", fid);
    onOpen(doc.id);
  }

  async function newFolder(): Promise<Folder | null> {
    const name = prompt("Folder name");
    if (!name) return null;
    const f = await api.createFolder(name);
    await refresh();
    return f;
  }

  async function removeFolder(f: Folder) {
    if (!confirm(`Delete folder "${f.name}"? Essays inside become unfiled.`)) return;
    await api.deleteFolder(f.id);
    if (folderId === f.id) setFolderId("all");
    refresh();
  }

  async function removeDoc(id: string) {
    setMenu(null);
    if (!confirm("Delete this essay and its versions? This cannot be undone.")) return;
    await api.deleteDoc(id);
    refresh();
  }

  async function moveDoc(id: string, target: string | null) {
    setMenu(null);
    await api.saveDoc(id, { folderId: target });
    refresh();
  }

  async function moveToNewFolder(id: string) {
    const f = await newFolder();
    if (f) moveDoc(id, f.id);
  }

  async function importFiles(files: FileList | null) {
    if (!files || !files.length) return;
    const fid = folderId === "all" || folderId === "unfiled" ? null : folderId;
    let firstId: string | null = null;
    for (const file of Array.from(files)) {
      const text = await file.text();
      const title =
        text.match(/^#\s+(.+)$/m)?.[1]?.trim() ||
        file.name.replace(/\.(md|markdown|txt)$/i, "") ||
        "Imported";
      const doc = await api.createDoc(title, fid);
      await api.saveDoc(doc.id, {
        baseline: true,
        blocks: splitText(text).map((t) => ({ id: uid(), type: guessType(t), text: t })),
      });
      firstId = firstId || doc.id;
    }
    if (fileInput.current) fileInput.current.value = "";
    if (files.length === 1 && firstId) onOpen(firstId);
    else refresh();
  }

  const headTitle =
    folderId === "all"
      ? "All essays"
      : folderId === "unfiled"
      ? "Unfiled"
      : folders.find((f) => f.id === folderId)?.name || "Essays";

  function openMenu(id: string, el: HTMLElement) {
    const r = el.getBoundingClientRect();
    setMenu({ id, x: r.right, y: r.bottom + 4 });
  }
  const menuDoc = menu && docs.find((d) => d.id === menu.id);

  return (
    <div className="landing">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">M</span>
          <div className="brand-text">
            <div className="brand-name">MARGINS</div>
            <div className="brand-sub">writing studio</div>
          </div>
        </div>

        <button className="new-essay" onClick={newDoc}>
          + New essay
        </button>

        <nav className="folders">
          <button
            className={`folder ${folderId === "all" ? "active" : ""}`}
            onClick={() => setFolderId("all")}
          >
            <span className="folder-name">All essays</span>
            <span className="folder-count">{counts.all}</span>
          </button>
          <button
            className={`folder ${folderId === "unfiled" ? "active" : ""}`}
            onClick={() => setFolderId("unfiled")}
          >
            <span className="folder-name">Unfiled</span>
            <span className="folder-count">{counts.unfiled || 0}</span>
          </button>

          <div className="folders-head">
            <span>Folders</span>
            <button className="mini" onClick={newFolder} title="New folder">
              +
            </button>
          </div>

          {folders.length === 0 && (
            <div className="folders-empty">
              No folders yet. Create one, or use an essay's ⋯ menu to file it.
            </div>
          )}

          {folders.map((f) => (
            <div
              key={f.id}
              className={`folder ${folderId === f.id ? "active" : ""}`}
              onClick={() => setFolderId(f.id)}
              role="button"
            >
              <span className="folder-name">{f.name}</span>
              <span className="folder-count">{counts[f.id] || 0}</span>
              <button
                className="folder-del"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFolder(f);
                }}
                title="Delete folder"
              >
                ×
              </button>
            </div>
          ))}
        </nav>

        <button className="import-btn" onClick={() => fileInput.current?.click()}>
          Import .md
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".md,.markdown,.txt,text/markdown,text/plain"
          multiple
          hidden
          onChange={(e) => importFiles(e.target.files)}
        />
      </aside>

      <main className="library">
        <GoalCard refreshKey={docs.length} />
        <header className="library-head">
          <div className="library-title">
            <h1>{headTitle}</h1>
            <span className="library-meta">
              {filtered.length} {filtered.length === 1 ? "piece" : "pieces"} ·{" "}
              {totalWords.toLocaleString()} words
            </span>
          </div>

          <div className="controls">
            <input
              className="search"
              placeholder="Search…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="seg">
              <button
                className={sort === "edited" ? "on" : ""}
                onClick={() => setSort("edited")}
              >
                Recent
              </button>
              <button
                className={sort === "added" ? "on" : ""}
                onClick={() => setSort("added")}
              >
                Added
              </button>
            </div>
            <div className="seg">
              <button
                className={view === "gallery" ? "on" : ""}
                onClick={() => setView("gallery")}
              >
                ▦ Grid
              </button>
              <button
                className={view === "list" ? "on" : ""}
                onClick={() => setView("list")}
              >
                ☰ List
              </button>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="empty">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="empty">
            <p>Nothing here yet.</p>
            <button className="new-essay" onClick={newDoc}>
              + Start an essay
            </button>
          </div>
        ) : view === "gallery" ? (
          <div className="gallery">
            {filtered.map((d) => (
              <Card key={d.id} doc={d} sort={sort} onOpen={onOpen} onMenu={openMenu} />
            ))}
          </div>
        ) : (
          <div className="rows">
            <div className="row row-head">
              <span>Title</span>
              <span>Folder</span>
              <span>Words</span>
              <span>{sort === "edited" ? "Edited" : "Added"}</span>
              <span />
            </div>
            {filtered.map((d) => (
              <Row
                key={d.id}
                doc={d}
                sort={sort}
                folders={folders}
                onOpen={onOpen}
                onMenu={openMenu}
              />
            ))}
          </div>
        )}
      </main>

      {menu && menuDoc && (
        <>
          <div className="menu-scrim" onClick={() => setMenu(null)} />
          <div
            className="doc-menu"
            style={{ left: menu.x, top: menu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={() => { setMenu(null); onOpen(menuDoc.id); }}>
              Open
            </button>
            <div className="doc-menu-label">Move to folder</div>
            <button
              className={!menuDoc.folderId ? "on" : ""}
              onClick={() => moveDoc(menuDoc.id, null)}
            >
              Unfiled
            </button>
            {folders.map((f) => (
              <button
                key={f.id}
                className={menuDoc.folderId === f.id ? "on" : ""}
                onClick={() => moveDoc(menuDoc.id, f.id)}
              >
                {f.name}
              </button>
            ))}
            <button className="new" onClick={() => moveToNewFolder(menuDoc.id)}>
              + New folder…
            </button>
            <div className="doc-menu-sep" />
            <button className="danger" onClick={() => removeDoc(menuDoc.id)}>
              Delete essay
            </button>
          </div>
        </>
      )}
    </div>
  );
}

interface CardProps {
  doc: DocSummary;
  sort: SortKey;
  onOpen: (id: string) => void;
  onMenu: (id: string, el: HTMLElement) => void;
}

function MenuButton({ doc, onMenu }: { doc: DocSummary; onMenu: CardProps["onMenu"] }) {
  return (
    <button
      className="doc-menu-btn"
      title="Actions"
      onClick={(e) => {
        e.stopPropagation();
        onMenu(doc.id, e.currentTarget);
      }}
    >
      ⋯
    </button>
  );
}

function Card({ doc, sort, onOpen, onMenu }: CardProps) {
  return (
    <article className="card" onClick={() => onOpen(doc.id)}>
      <div className="card-paper">
        <div className="card-excerpt">{doc.excerpt || "Empty page…"}</div>
        {doc.annotationCount > 0 && (
          <span className="card-pill">{doc.annotationCount} marks</span>
        )}
      </div>
      <div className="card-foot">
        <div className="card-title">{doc.title || "Untitled"}</div>
        <MenuButton doc={doc} onMenu={onMenu} />
      </div>
      <div className="card-sub">
        <span>{doc.wordCount} words</span>
        <span>
          {sort === "edited" ? timeAgo(doc.updatedAt) : dateLabel(doc.createdAt)}
        </span>
      </div>
    </article>
  );
}

function Row({
  doc,
  sort,
  folders,
  onOpen,
  onMenu,
}: CardProps & { folders: Folder[] }) {
  const folderName = doc.folderId && folders.find((f) => f.id === doc.folderId)?.name;
  return (
    <div className="row" onClick={() => onOpen(doc.id)} role="button">
      <span className="row-title">{doc.title || "Untitled"}</span>
      <span className="row-folder">{folderName || "—"}</span>
      <span>{doc.wordCount}</span>
      <span>{sort === "edited" ? timeAgo(doc.updatedAt) : dateLabel(doc.createdAt)}</span>
      <span className="row-menu" onClick={(e) => e.stopPropagation()}>
        <MenuButton doc={doc} onMenu={onMenu} />
      </span>
    </div>
  );
}
