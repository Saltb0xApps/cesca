import { useEffect, useState } from "react";
import { api } from "../api";
import type { StorageInfo } from "../types";

// Lets you see and choose the folder where every essay is saved as a .md file.
export function StoragePanel({ onClose }: { onClose: () => void }) {
  const [info, setInfo] = useState<StorageInfo | null>(null);
  const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api.getStorage().then((s) => {
      setInfo(s);
      setCustom(s.dataDir);
    });
  }, []);

  async function choose(dir: string) {
    if (!dir.trim() || !info) return;
    setBusy(true);
    setMsg("Moving your files…");
    try {
      const r = await api.setStorage(dir.trim());
      setInfo({ ...info, dataDir: r.dataDir });
      setCustom(r.dataDir);
      setMsg(r.moved ? "Moved. Your essays now live here." : "Saved.");
    } catch (e) {
      setMsg("Couldn't use that folder. " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="storage-panel" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <h2>Where your essays are saved</h2>
          <button className="ghost" onClick={onClose}>
            ×
          </button>
        </div>

        {!info ? (
          <div className="empty small">Loading…</div>
        ) : (
          <>
            <p className="storage-note">
              Every essay is a plain <b>.md</b> file. Pick where they live — moving
              folders brings your existing essays and versions along.
            </p>

            <div className="storage-current">
              <span className="storage-label">Current folder</span>
              <code>{info.dataDir}</code>
              <button
                className="ghost small"
                onClick={() => api.revealStorage()}
                title="Open this folder"
              >
                Reveal in Finder
              </button>
            </div>

            <div className="storage-label">Quick choices</div>
            <div className="storage-options">
              {info.options.map((o) => (
                <button
                  key={o.path}
                  className={`storage-opt ${o.path === info.dataDir ? "on" : ""}`}
                  disabled={busy}
                  onClick={() => choose(o.path)}
                >
                  <span className="opt-label">{o.label}</span>
                  <span className="opt-path">{o.path}</span>
                </button>
              ))}
            </div>

            <div className="storage-label">Or type a folder path</div>
            <div className="storage-custom">
              <input
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder="/Users/you/Documents/Margins"
                spellCheck={false}
              />
              <button
                className="storage-save"
                disabled={busy || !custom.trim()}
                onClick={() => choose(custom)}
              >
                Save
              </button>
            </div>

            {msg && <div className="storage-msg">{msg}</div>}
          </>
        )}
      </div>
    </div>
  );
}
