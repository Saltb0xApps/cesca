"use client";

import { useEffect, useRef, useState } from "react";

const PALETTE = ["#4dff7c", "#ffd24d", "#ff6b9d", "#6bb8ff", "#ffffff", "#b06b2e"];
const SIZE = 260;

// A tiny pointer/touch drawing pad. Exposes the drawing as a PNG data URL via
// onChange so the parent form can submit it. Works on phones (pointer events).
export function DrawingCanvas({ onChange }: { onChange: (dataUrl: string) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [color, setColor] = useState(PALETTE[0]);
  const [brush, setBrush] = useState(4);
  const [touched, setTouched] = useState(false);

  // Paint the dark backdrop once so exported PNGs aren't transparent.
  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#0d130d";
    ctx.fillRect(0, 0, SIZE, SIZE);
  }, []);

  const pos = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * SIZE, y: ((e.clientY - r.top) / r.height) * SIZE };
  };

  const start = (e: React.PointerEvent) => {
    drawing.current = true;
    last.current = pos(e);
    ref.current!.setPointerCapture(e.pointerId);
  };

  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const ctx = ref.current!.getContext("2d")!;
    const p = pos(e);
    ctx.strokeStyle = color;
    ctx.lineWidth = brush;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(last.current!.x, last.current!.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
  };

  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    last.current = null;
    setTouched(true);
    onChange(ref.current!.toDataURL("image/png"));
  };

  const clear = () => {
    const ctx = ref.current!.getContext("2d")!;
    ctx.fillStyle = "#0d130d";
    ctx.fillRect(0, 0, SIZE, SIZE);
    setTouched(false);
    onChange("");
  };

  return (
    <div>
      <label>Draw your flower</label>
      <canvas
        ref={ref}
        width={SIZE}
        height={SIZE}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        style={{
          touchAction: "none",
          width: "100%",
          maxWidth: SIZE,
          aspectRatio: "1 / 1",
          border: "1px solid var(--line)",
          background: "#0d130d",
          cursor: "crosshair",
          display: "block",
        }}
      />
      <div style={{ display: "flex", gap: 8, alignItems: "center", margin: "8px 0 16px", flexWrap: "wrap" }}>
        {PALETTE.map((c) => (
          <button
            type="button"
            key={c}
            onClick={() => setColor(c)}
            aria-label={`color ${c}`}
            style={{
              width: 22,
              height: 22,
              background: c,
              border: color === c ? "2px solid #fff" : "1px solid #163d22",
              cursor: "pointer",
            }}
          />
        ))}
        <input
          type="range"
          min={2}
          max={20}
          value={brush}
          onChange={(e) => setBrush(Number(e.target.value))}
          style={{ flex: 1, minWidth: 70 }}
        />
        <button type="button" className="btn ghost" onClick={clear} style={{ padding: "4px 10px" }}>
          clear
        </button>
      </div>
      {!touched && <p className="faint" style={{ fontSize: 12, marginTop: -8 }}>a blank plot grows nothing.</p>}
    </div>
  );
}
