"use client";

import { useEffect, useState } from "react";

// The guilt-trip modal every app shows when you try to leave — except here
// leaving is the RIGHT move. The dark pattern, inverted.
export function ExitGuard() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let armed = true;
    const onLeave = (e: MouseEvent) => {
      // fire when the cursor exits the top of the viewport (intent to leave)
      if (armed && e.clientY <= 0) {
        armed = false;
        setShow(true);
      }
    };
    document.addEventListener("mouseout", onLeave);
    return () => document.removeEventListener("mouseout", onLeave);
  }, []);

  if (!show) return null;
  return (
    <div className="modal-backdrop" onClick={() => setShow(false)}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0, color: "var(--warn)" }}>wait — your garden needs you 🥺</h3>
        <p className="muted">if you leave now, who will water it? (nobody. that's the point. it heals when you go.)</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 18 }}>
          <a href="javascript:window.close()" className="btn">
            leave (correct)
          </a>
          <button className="btn danger" onClick={() => setShow(false)}>
            stay & watch it die
          </button>
        </div>
      </div>
    </div>
  );
}
