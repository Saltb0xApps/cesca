import { motion } from "framer-motion";
import type { Entry } from "../types";

interface DonePanelProps {
  entry: Entry;
  onCloseBook: () => void;
}

export function DonePanel({ entry, onCloseBook }: DonePanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="h-full w-full px-14 py-12 flex flex-col items-center text-ink"
    >
      <div className="text-ink/60 uppercase tracking-[0.25em] text-[10px] font-serif">
        Time&apos;s Up
      </div>
      <div className="mt-2 font-serif italic text-3xl leading-tight text-center">
        Permission fulfilled.
      </div>

      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.2 }}
        className="mt-8"
      >
        <svg width={160} height={160} viewBox="0 0 160 160">
          <circle
            cx={80}
            cy={80}
            r={68}
            fill="none"
            stroke="rgba(42,31,20,0.2)"
            strokeWidth={3}
          />
          <motion.path
            d="M 48 84 L 72 106 L 116 60"
            fill="none"
            stroke="#b53030"
            strokeWidth={8}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.6, delay: 0.4, ease: "easeInOut" }}
          />
        </svg>
      </motion.div>

      <div className="mt-6 text-center max-w-[85%]">
        <div className="ink text-xl leading-snug">
          {entry.minutes} minutes on {entry.platform}
        </div>
        <div className="ink text-base text-ink/60 mt-1 italic">
          for "{entry.reason}"
        </div>
      </div>

      <button
        type="button"
        onClick={onCloseBook}
        className="mt-auto rounded-full px-5 py-2 text-sm font-serif tracking-wider uppercase
                   border-2 bg-ink text-paper border-ink hover:-translate-y-[1px] transition"
      >
        Close the book
      </button>
    </motion.div>
  );
}
