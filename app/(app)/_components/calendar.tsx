"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

interface Row {
  pageId: string;
  account: string;
  name: string;
  status: string;
  platforms: string[];
  scheduledFor: string | null;
  publishedAt: string | null;
  lastEditedTime: string;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function startOfWeek(d: Date): Date {
  const day = (d.getDay() + 6) % 7;
  const out = new Date(d);
  out.setDate(d.getDate() - day);
  out.setHours(0, 0, 0, 0);
  return out;
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(d.getDate() + n);
  return out;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function Calendar() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<Date>(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  useEffect(() => {
    fetch("/api/posts")
      .then((r) => r.json())
      .then((d: { rows: Row[]; error?: string }) => {
        if (d.error) setError(d.error);
        else setRows(d.rows || []);
      })
      .catch((e) => setError((e as Error).message));
  }, []);

  const grid = useMemo(() => {
    const firstOfMonth = new Date(cursor);
    const gridStart = startOfWeek(firstOfMonth);
    const days: Date[] = [];
    for (let i = 0; i < 42; i++) days.push(addDays(gridStart, i));
    return days;
  }, [cursor]);

  const postsByDay = useMemo(() => {
    const map = new Map<string, Row[]>();
    for (const r of rows) {
      const iso = r.scheduledFor || r.publishedAt;
      if (!iso) continue;
      const d = new Date(iso);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const list = map.get(key) || [];
      list.push(r);
      map.set(key, list);
    }
    return map;
  }, [rows]);

  const title = cursor.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
  const today = new Date();

  return (
    <>
      <div className="calendar-toolbar">
        <div className="calendar-title">{title}</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="btn"
            onClick={() =>
              setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))
            }
          >
            ‹
          </button>
          <button
            className="btn"
            onClick={() => {
              const d = new Date();
              d.setDate(1);
              d.setHours(0, 0, 0, 0);
              setCursor(d);
            }}
          >
            Today
          </button>
          <button
            className="btn"
            onClick={() =>
              setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))
            }
          >
            ›
          </button>
        </div>
      </div>
      {error && <div className="error" style={{ marginBottom: 12 }}>{error}</div>}
      <div className="calendar">
        <div className="calendar-weekdays">
          {WEEKDAYS.map((w) => (
            <div key={w} className="calendar-weekday">
              {w}
            </div>
          ))}
        </div>
        <div className="calendar-grid">
          {grid.map((d) => {
            const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
            const posts = postsByDay.get(key) || [];
            const otherMonth = d.getMonth() !== cursor.getMonth();
            const isToday = sameDay(d, today);
            return (
              <div
                key={key}
                className={`calendar-day ${otherMonth ? "other-month" : ""}`}
              >
                <span className={`calendar-day-num ${isToday ? "today" : ""}`}>
                  {d.getDate()}
                </span>
                {posts.slice(0, 4).map((p) => (
                  <div
                    key={p.pageId}
                    className={`calendar-post status-${p.status.toLowerCase().replace(/\s/g, "-").replace(/-to-publish$/, "")}`}
                    onClick={() => router.push(`/board?highlight=${p.pageId}`)}
                    title={`${p.name} — ${p.account}`}
                  >
                    {p.name || "(untitled)"}
                  </div>
                ))}
                {posts.length > 4 && (
                  <div className="meta small">+{posts.length - 4} more</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
