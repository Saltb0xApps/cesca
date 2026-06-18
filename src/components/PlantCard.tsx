"use client";

import {
  glitchIntensity,
  stage,
  STAGE_COLOR,
  STAGE_LABEL,
  vitalityWith,
  type Rates,
} from "@/lib/rot";

export interface PlantView {
  id: string;
  label: string;
  drawing: string;
  kind: string;
  plantedAtActiveSeconds: number;
}

// Renders one hand-drawn flower and decays it in real time. `activeSeconds` and
// `lastSeenAt` come from the live engagement state (or a server snapshot on the
// fence pages), so the same component covers both live and static rendering.
export function PlantCard({
  plant,
  rates,
  activeSeconds,
  lastSeenAt,
}: {
  plant: PlantView;
  rates: Rates;
  activeSeconds: number;
  lastSeenAt: Date | string;
}) {
  const v = vitalityWith(rates, plant, { activeSeconds, lastSeenAt });
  const s = stage(v);
  const g = glitchIntensity(v);

  return (
    <div className="card">
      <div className="glitch" style={{ ["--g" as string]: g.toFixed(3), position: "relative" }}>
        {plant.drawing ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={plant.drawing}
            alt={plant.label}
            style={{
              width: "100%",
              aspectRatio: "1 / 1",
              objectFit: "cover",
              display: "block",
              imageRendering: "pixelated",
            }}
          />
        ) : (
          <div
            style={{
              aspectRatio: "1 / 1",
              display: "grid",
              placeItems: "center",
              fontSize: 40,
              background: "#0d130d",
              color: "var(--fg-faint)",
            }}
          >
            🌱
          </div>
        )}
        {/* rot tint grows with decay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "#b06b2e",
            mixBlendMode: "multiply",
            opacity: g * 0.6,
            pointerEvents: "none",
          }}
        />
        {s === "compost" && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              fontSize: 40,
              color: "#000",
              background: "rgba(0,0,0,0.45)",
            }}
          >
            💀
          </div>
        )}
      </div>

      <div className="vbar">
        <span style={{ width: `${v}%`, background: STAGE_COLOR[s] }} />
      </div>
      <div className="stage" style={{ color: STAGE_COLOR[s] }}>
        {STAGE_LABEL[s]} · {Math.round(v)}%{plant.kind === "GRAFT" ? " · GRAFT" : ""}
      </div>
      <div className="label">{plant.label}</div>
    </div>
  );
}
