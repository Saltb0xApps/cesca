"use client";

import { useState } from "react";

// Satirical microtransaction. "Premium Fertilizer" does nothing — or, on theme,
// makes it worse. Planned obsolescence, parodied.
export function PremiumButton() {
  const [msg, setMsg] = useState("");
  return (
    <div style={{ marginTop: 28, borderTop: "1px dashed var(--line)", paddingTop: 16 }}>
      <button
        className="btn"
        style={{ borderColor: "var(--warn)", color: "var(--warn)" }}
        onClick={() =>
          setMsg(
            "✨ thank you. your $4.99 has been composted. plants now rot 0% slower. upgrade to PLATINUM for the same result.",
          )
        }
      >
        🌟 unlock PREMIUM FERTILIZER — $4.99/mo
      </button>
      {msg && <p className="warn" style={{ fontSize: 13, marginTop: 10 }}>{msg}</p>}
    </div>
  );
}
