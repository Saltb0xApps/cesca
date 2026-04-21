import { useCallback, useEffect, useMemo, useState } from "react";
import { Book } from "./components/Book";
import { PermissionSlip } from "./components/PermissionSlip";
import { Timer } from "./components/Timer";
import { Ledger } from "./components/Ledger";
import { DonePanel } from "./components/DonePanel";
import type { Entry, Phase } from "./types";
import { loadEntries, saveEntries } from "./storage";

export default function App() {
  const [phase, setPhase] = useState<Phase>("closed");
  const [entries, setEntries] = useState<Entry[]>(() => loadEntries());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [striking, setStriking] = useState(false);

  useEffect(() => {
    saveEntries(entries);
  }, [entries]);

  const activeEntry = useMemo(
    () => entries.find((e) => e.id === activeId) ?? null,
    [entries, activeId],
  );

  const openBook = useCallback(() => setPhase("form"), []);

  const handleSubmit = useCallback(
    ({
      platform,
      reason,
      minutes,
    }: {
      platform: Entry["platform"];
      reason: string;
      minutes: number;
    }) => {
      const entry: Entry = {
        id: crypto.randomUUID(),
        platform,
        reason,
        minutes,
        startedAt: Date.now(),
        completed: false,
      };
      setEntries((prev) => [entry, ...prev]);
      setActiveId(entry.id);
      setPhase("timing");
    },
    [],
  );

  const handleComplete = useCallback(() => {
    if (!activeId) return;
    setStriking(true);
    setEntries((prev) =>
      prev.map((e) =>
        e.id === activeId ? { ...e, completed: true, endedAt: Date.now() } : e,
      ),
    );
    // Give the check-off animation a moment, then swap to done panel
    setTimeout(() => {
      setPhase("done");
      setStriking(false);
    }, 1800);
  }, [activeId]);

  const handleEndEarly = useCallback(() => {
    handleComplete();
  }, [handleComplete]);

  const closeBook = useCallback(() => {
    setPhase("closed");
    setActiveId(null);
  }, []);

  const rightPage = (() => {
    switch (phase) {
      case "form":
        return <PermissionSlip onSubmit={handleSubmit} />;
      case "timing":
        return activeEntry ? (
          <Timer
            entry={activeEntry}
            onComplete={handleComplete}
            onEndEarly={handleEndEarly}
          />
        ) : null;
      case "done":
        return activeEntry ? (
          <DonePanel entry={activeEntry} onCloseBook={closeBook} />
        ) : null;
      default:
        return null;
    }
  })();

  const leftPage = (
    <Ledger
      entries={entries}
      activeId={activeId}
      striking={striking}
    />
  );

  return (
    <div className="relative w-full h-full">
      <AmbientBackground />
      <Book
        isOpen={phase !== "closed"}
        onOpen={openBook}
        leftPage={leftPage}
        rightPage={rightPage}
      />
      <Footer />
    </div>
  );
}

function AmbientBackground() {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 35%, rgba(255, 200, 120, 0.18), transparent 55%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-30 mix-blend-overlay"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent 0, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 3px)",
        }}
      />
    </>
  );
}

function Footer() {
  return (
    <div className="absolute bottom-3 left-0 right-0 text-center text-[10px] uppercase tracking-[0.3em] text-amber-100/30 font-serif pointer-events-none">
      cesca — ask before you scroll
    </div>
  );
}
