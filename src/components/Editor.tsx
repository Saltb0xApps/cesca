import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api";
import type { Doc, Folder } from "../types";
import { WriteMode } from "./WriteMode";
import { EditMode } from "./EditMode";
import { VersionPanel } from "./VersionPanel";
import { SettingsMenu } from "./SettingsMenu";
import { Shortcuts } from "./Shortcuts";
import { reconcileBlocks, pruneAnnotations, blocksToText } from "../lib/text";
import { applySettings, loadSettings, saveSettings } from "../lib/settings";
import type { Settings } from "../lib/settings";

type Status = "saved" | "saving" | "dirty";

export function Editor({ id, onBack }: { id: string; onBack: () => void }) {
  const [doc, setDoc] = useState<Doc | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [mode, setMode] = useState<"write" | "edit">("write");
  const [status, setStatus] = useState<Status>("saved");
  const [showVersions, setShowVersions] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [settings, setSettings] = useState<Settings>(() => loadSettings());

  useEffect(() => {
    applySettings(settings);
    saveSettings(settings);
  }, [settings]);
  const patchSettings = (patch: Partial<Settings>) =>
    setSettings((s) => ({ ...s, ...patch }));

  const loadedRef = useRef(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([api.getDoc(id), api.listFolders()]).then(([d, f]) => {
      if (!alive) return;
      setDoc(d);
      setFolders(f);
      loadedRef.current = true;
    });
    return () => {
      alive = false;
    };
  }, [id]);

  const scheduleSave = useCallback((next: Doc) => {
    setStatus("dirty");
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(async () => {
      setStatus("saving");
      const saved = await api.saveDoc(next.id, {
        title: next.title,
        folderId: next.folderId,
        blocks: next.blocks,
        annotations: next.annotations,
      });
      setStatus("saved");
      setDoc((cur) =>
        cur ? { ...cur, updatedAt: saved.updatedAt } : cur
      );
    }, 700);
  }, []);

  const update = useCallback(
    (updater: (d: Doc) => Doc) => {
      setDoc((cur) => {
        if (!cur) return cur;
        const next = updater(cur);
        if (loadedRef.current) scheduleSave(next);
        return next;
      });
    },
    [scheduleSave]
  );

  // global keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) {
        if (e.key === "Escape") {
          setShowSettings(false);
          setShowShortcuts(false);
          setShowVersions(false);
        }
        return;
      }
      const k = e.key.toLowerCase();
      if (k === "e") {
        e.preventDefault();
        setMode((m) => (m === "write" ? "edit" : "write"));
      } else if (k === "s") {
        e.preventDefault();
        saveVersion();
      } else if (k === ",") {
        e.preventDefault();
        setShowSettings((v) => !v);
      } else if (k === "/") {
        e.preventDefault();
        setShowShortcuts((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc]);

  // Save immediately (e.g. before leaving) to avoid losing the debounce window.
  async function flush(d: Doc) {
    if (timer.current) window.clearTimeout(timer.current);
    await api.saveDoc(d.id, {
      title: d.title,
      folderId: d.folderId,
      blocks: d.blocks,
      annotations: d.annotations,
    });
  }

  async function handleBack() {
    if (doc) await flush(doc);
    onBack();
  }

  function onWriteChange(text: string) {
    update((d) => {
      const blocks = reconcileBlocks(d.blocks, text);
      return pruneAnnotations({ ...d, blocks });
    });
  }

  async function saveVersion() {
    if (!doc) return;
    await flush(doc);
    const label = prompt("Label this version (optional)") || "";
    await api.saveVersion(doc.id, label);
    alert("Version saved.");
  }

  async function onRestored(restored: Doc) {
    setDoc(restored);
    setShowVersions(false);
  }

  if (!doc) return <div className="editor-loading">Opening…</div>;

  return (
    <div className={`editor mode-${mode}`}>
      <header className="editor-bar">
        <button className="ghost" onClick={handleBack}>
          ← Library
        </button>

        <input
          className="title-input"
          value={doc.title}
          onChange={(e) => update((d) => ({ ...d, title: e.target.value }))}
          placeholder="Untitled essay"
        />

        <div className="bar-right">
          <select
            className="folder-select"
            value={doc.folderId || ""}
            onChange={(e) =>
              update((d) => ({ ...d, folderId: e.target.value || null }))
            }
          >
            <option value="">Unfiled</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>

          <div className="mode-toggle">
            <button
              className={mode === "write" ? "on" : ""}
              onClick={() => setMode("write")}
            >
              Write
            </button>
            <button
              className={mode === "edit" ? "on" : ""}
              onClick={() => setMode("edit")}
            >
              Edit
            </button>
          </div>

          <button className="ghost" onClick={saveVersion}>
            Save version
          </button>
          <button className="ghost" onClick={() => setShowVersions(true)}>
            History
          </button>
          <div className="pop-anchor">
            <button
              className="ghost icon"
              title="Formatting (⌘,)"
              onClick={() => setShowSettings((v) => !v)}
            >
              Aa
            </button>
            {showSettings && (
              <SettingsMenu
                settings={settings}
                onChange={patchSettings}
                onClose={() => setShowSettings(false)}
              />
            )}
          </div>
          <button
            className="ghost icon"
            title="Keyboard shortcuts (⌘/)"
            onClick={() => setShowShortcuts(true)}
          >
            ⌘
          </button>

          <span className={`status status-${status}`}>
            {status === "saving"
              ? "saving…"
              : status === "dirty"
              ? "unsaved"
              : "saved"}
          </span>
        </div>
      </header>

      <div className="editor-stage">
        {mode === "write" ? (
          <WriteMode
            text={blocksToText(doc.blocks)}
            onChange={onWriteChange}
          />
        ) : (
          <EditMode doc={doc} update={update} />
        )}
      </div>

      {showVersions && (
        <VersionPanel
          docId={doc.id}
          onClose={() => setShowVersions(false)}
          onRestored={onRestored}
        />
      )}

      {showShortcuts && <Shortcuts onClose={() => setShowShortcuts(false)} />}
    </div>
  );
}
