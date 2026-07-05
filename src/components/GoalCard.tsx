import { useEffect, useState } from "react";
import { api } from "../api";
import type { Stats } from "../types";

// A compact daily-writing-goal card: today's words vs the goal, a progress bar,
// a 14-day sparkline, and the current streak. Editable goal.
export function GoalCard({ refreshKey }: { refreshKey: number }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  async function load() {
    try {
      setStats(await api.getStats());
    } catch {
      /* ignore */
    }
  }
  useEffect(() => {
    load();
  }, [refreshKey]);

  if (!stats) return null;

  const pct = Math.min(100, Math.round((stats.today / Math.max(1, stats.goal)) * 100));
  const max = Math.max(stats.goal, ...stats.recent.map((r) => r.words), 1);

  async function saveGoal() {
    const n = parseInt(draft, 10);
    setEditing(false);
    if (Number.isFinite(n) && n > 0) setStats(await api.setGoal(n));
  }

  return (
    <div className="goal-card">
      <div className="goal-top">
        <div className="goal-figure">
          <span className="goal-today">{stats.today.toLocaleString()}</span>
          <span className="goal-of">
            / {stats.goal.toLocaleString()} words today
          </span>
        </div>
        <div className="goal-streak" title="Consecutive days you hit the goal">
          {stats.streak > 0 ? (
            <>
              <span className="streak-num">{stats.streak}</span>
              <span className="streak-label">day streak</span>
            </>
          ) : (
            <span className="streak-label">no streak yet</span>
          )}
        </div>
      </div>

      <div className="goal-bar">
        <div
          className={`goal-fill ${stats.todayMet ? "met" : ""}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="goal-foot">
        <div className="sparkline" title="Last 14 days">
          {stats.recent.map((r) => (
            <span
              key={r.date}
              className={`spark ${r.words >= stats.goal ? "hit" : ""}`}
              style={{ height: `${Math.max(6, (r.words / max) * 26)}px` }}
              title={`${r.date}: ${r.words} words`}
            />
          ))}
        </div>
        {editing ? (
          <span className="goal-edit">
            <input
              autoFocus
              type="number"
              min={1}
              defaultValue={stats.goal}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveGoal()}
              onBlur={saveGoal}
            />
            <span>words/day</span>
          </span>
        ) : (
          <button
            className="goal-set"
            onClick={() => {
              setDraft(String(stats.goal));
              setEditing(true);
            }}
          >
            {stats.todayMet ? "Goal met ✓ · edit" : "Set goal"}
          </button>
        )}
      </div>
    </div>
  );
}
