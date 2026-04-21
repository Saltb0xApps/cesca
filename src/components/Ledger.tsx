import { motion } from "framer-motion";
import type { Entry } from "../types";

interface LedgerProps {
  entries: Entry[];
  activeId?: string | null;
  striking?: boolean;
}

export function Ledger({ entries, activeId, striking }: LedgerProps) {
  return (
    <div className="h-full w-full ruled margin-line px-14 pt-10 pb-8 overflow-hidden">
      <div className="text-ink/70 uppercase tracking-[0.25em] text-[10px] font-serif">
        The Ledger
      </div>
      <div className="font-serif italic text-2xl text-ink leading-tight">
        Permissions Granted
      </div>

      <ul className="mt-5 space-y-[6px] no-scrollbar overflow-y-auto max-h-[74%]">
        {entries.length === 0 && (
          <li className="ink text-lg text-ink/40 leading-[34px]">
            — no entries yet, the book is new —
          </li>
        )}
        {entries.map((e) => (
          <LedgerRow
            key={e.id}
            entry={e}
            isActive={e.id === activeId}
            striking={!!striking && e.id === activeId}
          />
        ))}
      </ul>

      <div className="absolute bottom-4 left-14 right-14 flex justify-between text-ink/40 font-serif text-[10px] uppercase tracking-[0.25em]">
        <span>· i ·</span>
        <span>{entries.length} entr{entries.length === 1 ? "y" : "ies"}</span>
      </div>
    </div>
  );
}

function LedgerRow({
  entry,
  isActive,
  striking,
}: {
  entry: Entry;
  isActive: boolean;
  striking: boolean;
}) {
  const shouldStrike = entry.completed || striking;
  return (
    <li className="relative leading-[34px]">
      <div className="flex items-baseline gap-2">
        <span className="ink text-lg text-ink/60 w-10 shrink-0">
          {formatTime(entry.startedAt)}
        </span>
        <span className="ink text-lg truncate">
          <span className="text-ink/90">{entry.platform}</span>
          <span className="text-ink/50"> — {entry.reason}</span>
          <span className="text-ink/50"> ({entry.minutes}m)</span>
        </span>
      </div>

      {shouldStrike && (
        <svg
          className="absolute left-0 right-0 top-1/2 -translate-y-1/2 pointer-events-none"
          viewBox="0 0 400 20"
          preserveAspectRatio="none"
          style={{ width: "100%", height: 20 }}
        >
          <motion.path
            d="M 4 12 Q 100 4, 200 10 T 396 8"
            className="strike-path"
            initial={{ pathLength: entry.completed && !isActive ? 1 : 0 }}
            animate={{ pathLength: 1 }}
            transition={{
              duration: striking ? 0.9 : 0,
              ease: "easeInOut",
              delay: striking ? 0.2 : 0,
            }}
          />
        </svg>
      )}

      {shouldStrike && (
        <motion.span
          initial={{ scale: 0, rotate: -20, opacity: 0 }}
          animate={{ scale: 1, rotate: -8, opacity: 1 }}
          transition={{
            delay: striking ? 1.0 : 0,
            type: "spring",
            stiffness: 260,
            damping: 16,
          }}
          className="absolute -right-2 top-0 text-red-700 font-serif italic text-xl"
          style={{ textShadow: "0 1px 0 rgba(0,0,0,0.15)" }}
        >
          ✓
        </motion.span>
      )}
    </li>
  );
}

function formatTime(ts: number) {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
