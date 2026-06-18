"use client";

import { useEffect, useRef, useState } from "react";
import { PlantCard, type PlantView } from "./PlantCard";
import type { Rates } from "@/lib/rot";

// Holds the live engagement clock for the garden. Ticks locally every second so
// plants wilt smoothly, and persists to the server every 5s. The meter on top
// is the anxious centerpiece: every second you watch, your garden dies a little.
export function GardenLive({
  plants,
  rates,
  initialActiveSeconds,
}: {
  plants: PlantView[];
  rates: Rates;
  initialActiveSeconds: number;
}) {
  const [activeSeconds, setActiveSeconds] = useState(initialActiveSeconds);
  const [lastSeenAt, setLastSeenAt] = useState<Date>(new Date());
  const [focused, setFocused] = useState(true);
  const acc = useRef(0); // seconds accumulated since last server flush

  useEffect(() => {
    const flush = (away: boolean) => {
      const seconds = away ? 0 : acc.current;
      acc.current = 0;
      const body = JSON.stringify({ seconds, away });
      if (away && navigator.sendBeacon) {
        navigator.sendBeacon("/api/heartbeat", body);
        return;
      }
      fetch("/api/heartbeat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
        keepalive: true,
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d && typeof d.activeSeconds === "number") {
            // reconcile up to the authoritative server value
            setActiveSeconds((cur) => Math.max(cur, d.activeSeconds));
          }
        })
        .catch(() => {});
    };

    // local 1s tick — only while focused/visible
    const tick = setInterval(() => {
      if (document.hidden) return;
      setActiveSeconds((s) => s + 1);
      setLastSeenAt(new Date());
      acc.current += 1;
    }, 1000);

    // persist every 5s
    const sync = setInterval(() => {
      if (!document.hidden && acc.current > 0) flush(false);
    }, 5000);

    const onVis = () => {
      const vis = !document.hidden;
      setFocused(vis);
      if (!vis) flush(true);
      else setLastSeenAt(new Date());
    };
    const onHide = () => flush(true);

    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", onHide);
    return () => {
      clearInterval(tick);
      clearInterval(sync);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", onHide);
      flush(true);
    };
  }, []);

  const mins = Math.floor(activeSeconds / 60);
  const secs = activeSeconds % 60;

  return (
    <>
      <div className="meter">
        <span>
          ⏱ time wasted here:{" "}
          <span className="big">
            {mins}m {String(secs).padStart(2, "0")}s
          </span>
        </span>
        <span className="muted" style={{ color: "#c97b3a" }}>
          {focused ? "← your garden is rotting as you read this" : "you left. it's healing. stay gone."}
        </span>
      </div>

      <div className="wrap" style={{ paddingTop: 24 }}>
        {plants.length === 0 ? (
          <p className="muted">
            nothing planted yet. draw something you love below — then close the tab and let it live.
          </p>
        ) : (
          <div className="grid">
            {plants.map((p) => (
              <PlantCard
                key={p.id}
                plant={p}
                rates={rates}
                activeSeconds={activeSeconds}
                lastSeenAt={lastSeenAt}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
