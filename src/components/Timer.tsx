import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { Entry } from "../types";

interface TimerProps {
  entry: Entry;
  onComplete: () => void;
  onEndEarly: () => void;
}

export function Timer({ entry, onComplete, onEndEarly }: TimerProps) {
  const totalMs = entry.minutes * 60 * 1000;
  const [remaining, setRemaining] = useState(
    Math.max(0, entry.startedAt + totalMs - Date.now()),
  );
  const fired = useRef(false);

  useEffect(() => {
    const id = setInterval(() => {
      const r = Math.max(0, entry.startedAt + totalMs - Date.now());
      setRemaining(r);
      if (r === 0 && !fired.current) {
        fired.current = true;
        onComplete();
      }
    }, 200);
    return () => clearInterval(id);
  }, [entry.startedAt, totalMs, onComplete]);

  const mm = Math.floor(remaining / 60000);
  const ss = Math.floor((remaining % 60000) / 1000);
  const progress = 1 - remaining / totalMs;

  // Circle geometry
  const R = 96;
  const C = 2 * Math.PI * R;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="h-full w-full px-14 py-12 flex flex-col items-center text-ink"
    >
      <div className="text-ink/60 uppercase tracking-[0.25em] text-[10px] font-serif">
        Permission in Effect
      </div>
      <div className="mt-1 font-serif italic text-xl text-ink">
        {entry.platform}
      </div>

      <div className="relative mt-8">
        <svg width={220} height={220} viewBox="0 0 220 220">
          <circle
            cx={110}
            cy={110}
            r={R}
            fill="none"
            stroke="rgba(42,31,20,0.15)"
            strokeWidth={6}
          />
          <motion.circle
            cx={110}
            cy={110}
            r={R}
            fill="none"
            stroke="#2a1f14"
            strokeWidth={6}
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - progress)}
            transform="rotate(-90 110 110)"
            transition={{ ease: "linear" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="font-serif text-5xl tabular-nums">
            {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
          </div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-ink/50 mt-1">
            remaining
          </div>
        </div>
      </div>

      <div className="mt-6 px-4 text-center max-w-[85%]">
        <div className="text-ink/50 text-[10px] uppercase tracking-[0.25em] font-serif">
          Reason
        </div>
        <div className="ink text-xl mt-1 leading-snug">"{entry.reason}"</div>
      </div>

      <button
        type="button"
        onClick={onEndEarly}
        className="mt-auto text-[11px] uppercase tracking-[0.25em] font-serif text-ink/50 hover:text-ink underline underline-offset-4"
      >
        End early & close book
      </button>
    </motion.div>
  );
}
