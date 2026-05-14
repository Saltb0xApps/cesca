"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

interface Row {
  pageId: string;
  name: string;
  status: string;
  platforms: string[];
  scheduledFor: string | null;
  publishedUrls: string;
  lastError: string;
  publishedAt: string | null;
  lastEditedTime: string;
}

const COLUMNS: Array<{ key: string; title: string; statuses: string[] }> = [
  { key: "scheduled", title: "Scheduled & Ready", statuses: ["Ready to publish"] },
  { key: "publishing", title: "Publishing", statuses: ["Publishing"] },
  { key: "published", title: "Published", statuses: ["Published"] },
  { key: "failed", title: "Failed", statuses: ["Failed"] },
];

function parseUrls(text: string): Array<{ platform: string; url: string }> {
  return text
    .split("\n")
    .map((line) => {
      const idx = line.indexOf(":");
      if (idx < 0) return null;
      return {
        platform: line.slice(0, idx).trim(),
        url: line.slice(idx + 1).trim(),
      };
    })
    .filter((x): x is { platform: string; url: string } => !!x);
}

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

function formatScheduled(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (sameDay) return `today ${time}`;
  return `${d.toLocaleDateString([], { month: "short", day: "numeric" })} ${time}`;
}

export default function Board() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/posts", { cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || `HTTP ${res.status}`);
        return;
      }
      const json = (await res.json()) as { rows: Row[] };
      setRows(json.rows);
      setError(null);
      setLastUpdated(new Date());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 10_000);
    return () => clearInterval(id);
  }, [refresh]);

  const grouped = useMemo(() => {
    const out: Record<string, Row[]> = {};
    for (const col of COLUMNS) out[col.key] = [];
    for (const row of rows) {
      const col = COLUMNS.find((c) => c.statuses.includes(row.status));
      if (col) out[col.key].push(row);
    }
    return out;
  }, [rows]);

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">Cesca</div>
        <div className="topbar-right">
          {error && <span className="error-pill">{error}</span>}
          {lastUpdated && (
            <span className="muted small">
              updated {timeAgo(lastUpdated.toISOString())}
            </span>
          )}
          <button className="ghost" onClick={refresh}>
            Refresh
          </button>
          <button className="ghost" onClick={logout}>
            Sign out
          </button>
        </div>
      </header>

      {loading && rows.length === 0 ? (
        <div className="loading">Loading…</div>
      ) : (
        <div className="board">
          {COLUMNS.map((col) => (
            <Column key={col.key} title={col.title} rows={grouped[col.key]} />
          ))}
        </div>
      )}
    </div>
  );
}

function Column({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <section className="column">
      <h2>
        {title} <span className="count">{rows.length}</span>
      </h2>
      <div className="column-cards">
        {rows.length === 0 ? (
          <div className="empty">—</div>
        ) : (
          rows.map((r) => <Card key={r.pageId} row={r} />)
        )}
      </div>
    </section>
  );
}

function Card({ row }: { row: Row }) {
  const urls = parseUrls(row.publishedUrls);
  return (
    <article className="card">
      <div className="card-title">{row.name || "(untitled)"}</div>
      <div className="chips">
        {row.platforms.map((p) => (
          <span key={p} className={`chip chip-${p}`}>
            {p}
          </span>
        ))}
      </div>
      {row.scheduledFor && row.status === "Ready to publish" && (
        <div className="meta">⏰ {formatScheduled(row.scheduledFor)}</div>
      )}
      {row.publishedAt && row.status === "Published" && (
        <div className="meta">✓ {timeAgo(row.publishedAt)}</div>
      )}
      {urls.length > 0 && (
        <ul className="urls">
          {urls.map((u) => (
            <li key={u.platform}>
              <span className="muted small">{u.platform}</span>{" "}
              <a href={u.url} target="_blank" rel="noopener">
                open ↗
              </a>
            </li>
          ))}
        </ul>
      )}
      {row.lastError && <div className="card-error">{row.lastError}</div>}
    </article>
  );
}
