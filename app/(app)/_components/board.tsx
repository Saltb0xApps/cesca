"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "./toast";

interface Row {
  pageId: string;
  account: string;
  name: string;
  status: string;
  platforms: string[];
  scheduledFor: string | null;
  publishedUrls: string;
  lastError: string;
  publishedAt: string | null;
  lastEditedTime: string;
}

interface PostsResponse {
  accounts: string[];
  rows: Row[];
}

const COLUMNS: Array<{ key: string; title: string; statuses: string[] }> = [
  { key: "scheduled", title: "Scheduled & Ready", statuses: ["Ready to publish", "Draft"] },
  { key: "publishing", title: "Publishing", statuses: ["Publishing"] },
  { key: "published", title: "Published", statuses: ["Published"] },
  { key: "failed", title: "Failed", statuses: ["Failed"] },
];

function parseUrls(text: string) {
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
  const toast = useToast();
  const [data, setData] = useState<PostsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [accountFilter, setAccountFilter] = useState<string>("all");
  const [publishing, setPublishing] = useState<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/posts", { cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || `HTTP ${res.status}`);
        return;
      }
      setData(await res.json());
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

  const visibleRows = useMemo(() => {
    if (!data) return [];
    if (accountFilter === "all") return data.rows;
    return data.rows.filter((r) => r.account === accountFilter);
  }, [data, accountFilter]);

  const grouped = useMemo(() => {
    const out: Record<string, Row[]> = {};
    for (const col of COLUMNS) out[col.key] = [];
    for (const row of visibleRows) {
      const col = COLUMNS.find((c) => c.statuses.includes(row.status));
      if (col) out[col.key].push(row);
    }
    return out;
  }, [visibleRows]);

  async function publishNow(row: Row) {
    if (publishing.has(row.pageId)) return;
    setPublishing((s) => new Set([...s, row.pageId]));
    try {
      const res = await fetch(
        `/api/rows/${row.pageId}/publish?account=${encodeURIComponent(row.account)}`,
        { method: "POST" },
      );
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        toast(b.error || `HTTP ${res.status}`, "error");
      } else {
        toast("Published!", "success");
      }
      await refresh();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setPublishing((s) => {
        const n = new Set(s);
        n.delete(row.pageId);
        return n;
      });
    }
  }

  const accounts = data?.accounts || [];
  const showAccountFilter = accounts.length > 1;

  return (
    <>
      <div className="main-header">
        <h1 className="page-title">Board</h1>
        <div className="main-header-right">
          {showAccountFilter && (
            <select
              className="select-inline"
              value={accountFilter}
              onChange={(e) => setAccountFilter(e.target.value)}
            >
              <option value="all">All accounts</option>
              {accounts.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          )}
          {error && <span className="error-pill">{error}</span>}
          {lastUpdated && (
            <span className="muted small">updated {timeAgo(lastUpdated.toISOString())}</span>
          )}
          <button className="btn btn-ghost" onClick={refresh}>
            Refresh
          </button>
        </div>
      </div>

      <div className="main-content">
        {loading && !data ? (
          <div className="empty">Loading…</div>
        ) : (
          <div className="board">
            {COLUMNS.map((col) => (
              <Column
                key={col.key}
                title={col.title}
                rows={grouped[col.key]}
                showAccount={showAccountFilter && accountFilter === "all"}
                publishNow={publishNow}
                publishing={publishing}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function Column({
  title,
  rows,
  showAccount,
  publishNow,
  publishing,
}: {
  title: string;
  rows: Row[];
  showAccount: boolean;
  publishNow: (r: Row) => void;
  publishing: Set<string>;
}) {
  return (
    <section className="column">
      <h2>
        {title} <span className="count">{rows.length}</span>
      </h2>
      <div className="column-cards">
        {rows.length === 0 ? (
          <div className="empty">—</div>
        ) : (
          rows.map((r) => (
            <Card
              key={r.pageId}
              row={r}
              showAccount={showAccount}
              publishNow={publishNow}
              publishing={publishing.has(r.pageId)}
            />
          ))
        )}
      </div>
    </section>
  );
}

function Card({
  row,
  showAccount,
  publishNow,
  publishing,
}: {
  row: Row;
  showAccount: boolean;
  publishNow: (r: Row) => void;
  publishing: boolean;
}) {
  const urls = parseUrls(row.publishedUrls);
  const canPublishNow = row.status === "Ready to publish" || row.status === "Draft" || row.status === "Failed";
  return (
    <article className="post-card">
      {showAccount && <div className="account-tag">{row.account}</div>}
      <div className="card-title">{row.name || "(untitled)"}</div>
      <div className="chips">
        {row.platforms.map((p) => (
          <span key={p} className={`chip chip-${p}`}>
            {p}
          </span>
        ))}
      </div>
      {row.scheduledFor && (row.status === "Ready to publish" || row.status === "Draft") && (
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
      {canPublishNow && (
        <div style={{ marginTop: "auto", display: "flex", justifyContent: "flex-end" }}>
          <button
            className="btn btn-primary"
            style={{ fontSize: 12, padding: "6px 10px" }}
            onClick={(e) => {
              e.stopPropagation();
              publishNow(row);
            }}
            disabled={publishing}
          >
            {publishing ? "Publishing…" : "Publish now"}
          </button>
        </div>
      )}
    </article>
  );
}
