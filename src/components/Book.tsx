import { motion, AnimatePresence } from "framer-motion";
import type { ReactNode } from "react";

interface BookProps {
  isOpen: boolean;
  onOpen: () => void;
  leftPage: ReactNode;
  rightPage: ReactNode;
}

export function Book({ isOpen, onOpen, leftPage, rightPage }: BookProps) {
  return (
    <div
      className="relative w-full h-full flex items-center justify-center"
      style={{ perspective: 2400 }}
    >
      <motion.div
        className="relative"
        initial={false}
        animate={{
          width: isOpen ? "min(1040px, 94vw)" : "min(360px, 70vw)",
          height: isOpen ? "min(640px, 84vh)" : "min(500px, 78vh)",
        }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Back cover / spine shadow */}
        <div className="absolute inset-0 rounded-[10px] leather shadow-book" />

        {/* Pages (two side-by-side) */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              key="pages"
              className="absolute inset-[14px] flex"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.35, duration: 0.4 }}
            >
              <div className="w-1/2 h-full bg-paper paper-grain rounded-l-sm relative overflow-hidden shadow-[inset_-18px_0_24px_-18px_rgba(0,0,0,0.35)]">
                {leftPage}
              </div>
              <div className="w-[2px] h-full bg-gradient-to-b from-black/30 via-black/60 to-black/30" />
              <div className="w-1/2 h-full bg-paper paper-grain rounded-r-sm relative overflow-hidden shadow-[inset_18px_0_24px_-18px_rgba(0,0,0,0.35)]">
                {rightPage}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Front cover — flips open */}
        <motion.button
          type="button"
          onClick={() => !isOpen && onOpen()}
          aria-label={isOpen ? "Book open" : "Open the book"}
          className="absolute inset-0 rounded-[10px] leather shadow-book origin-left focus:outline-none"
          style={{
            transformStyle: "preserve-3d",
            backfaceVisibility: "hidden",
            cursor: isOpen ? "default" : "pointer",
          }}
          initial={false}
          animate={{
            rotateY: isOpen ? -172 : 0,
            translateX: isOpen ? "-50%" : "0%",
            width: isOpen ? "50%" : "100%",
          }}
          transition={{ duration: 0.95, ease: [0.25, 1, 0.3, 1] }}
          whileHover={isOpen ? undefined : { scale: 1.02 }}
          whileTap={isOpen ? undefined : { scale: 0.98 }}
        >
          <CoverArt />
        </motion.button>

        {/* Bookmark ribbon */}
        {isOpen && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 180 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            className="absolute top-0 right-[28%] w-5 bg-gradient-to-b from-red-700 to-red-900 z-10"
            style={{
              clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 85%, 0 100%)",
            }}
          />
        )}
      </motion.div>
    </div>
  );
}

function CoverArt() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
      <div className="absolute inset-3 rounded-[8px] border border-gold/60" />
      <div className="absolute inset-5 rounded-[6px] border border-gold/30" />
      <div className="ink text-gold/90 tracking-[0.3em] text-[10px] uppercase mb-4">
        Est. Today
      </div>
      <div
        className="font-serif italic text-gold text-4xl leading-tight"
        style={{ textShadow: "0 2px 0 rgba(0,0,0,0.35)" }}
      >
        Cesca
      </div>
      <div className="mt-2 text-gold/80 font-serif text-sm tracking-widest uppercase">
        Ledger of
      </div>
      <div className="text-gold font-serif italic text-xl mt-1">
        Permissions Granted
      </div>
      <div className="mt-8 text-gold/70 text-[11px] tracking-[0.3em] uppercase">
        — tap to open —
      </div>
    </div>
  );
}
