import { useEffect, useState } from "react";
import { api } from "../api";
import type { Doc, VersionMeta } from "../types";
import { fullStamp } from "../lib/format";
import { blocksToText } from "../lib/text";

export function VersionPanel({
  docId,
  onClose,
  onRestored,
}: {
  docId: string;
  onClose: () => void;
  onRestored: (doc: Doc) => void;
}) {
  const [versions, setVersions] = useState<VersionMeta[]>([]);
  const [preview, setPreview] = useState<{ ts: string; doc: Doc } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listVersions(docId).then((v) => {
      setVersions(v);
      setLoading(false);
    });
  }, [docId]);

  async function open(ts: string) {
    const doc = await api.getVersion(docId, ts);
    setPreview({ ts, doc });
  }

  async function restore(ts: string) {
    if (!confirm("Restore this version? Your current text is replaced (save a version first if unsure)."))
      return;
    const doc = await api.restoreVersion(docId, ts);
    onRestored(doc);
  }

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <h2>Version history</h2>
          <button className="ghost" onClick={onClose}>
            ×
          </button>
        </div>

        {loading ? (
          <div className="empty">Loading…</div>
        ) : versions.length === 0 ? (
          <div className="empty small">
            No saved versions yet. Use “Save version” to snapshot the essay.
          </div>
        ) : (
          <ul className="version-list">
            {versions.map((v) => (
              <li
                key={v.ts}
                className={preview?.ts === v.ts ? "active" : ""}
                onClick={() => open(v.ts)}
              >
                <div className="version-main">
                  <span className="version-label">
                    {v.label || "Snapshot"}
                  </span>
                  <span className="version-stamp">{fullStamp(v.savedAt)}</span>
                </div>
                <div className="version-foot">
                  <span>{v.wordCount} words</span>
                  <button
                    className="restore"
                    onClick={(e) => {
                      e.stopPropagation();
                      restore(v.ts);
                    }}
                  >
                    Restore
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {preview && (
          <div className="version-preview">
            <div className="version-preview-head">
              Preview · {preview.doc.title}
            </div>
            <pre className="version-text">
              {blocksToText(preview.doc.blocks)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
