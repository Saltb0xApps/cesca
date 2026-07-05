import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type {
  Block,
  Doc,
  Highlight,
  HighlightColor,
  MarginNote,
  MoveArrow,
} from "../types";
import { renderBlockHTML, applyHighlights, offsetWithin } from "../lib/render";
import { uid } from "../lib/text";

interface Props {
  doc: Doc;
  update: (updater: (d: Doc) => Doc) => void;
}

interface SelInfo {
  blockId: string;
  start: number;
  end: number;
  rect: DOMRect;
}

interface ComputedNote {
  id: string;
  top: number;
  left: number;
  side: "left" | "right";
}
interface ComputedArrow {
  id: string;
  d: string;
  head: { x: number; y: number; angle: number };
  dot: { x: number; y: number };
  kind: "note" | "move";
  label?: string;
  mid?: { x: number; y: number };
}

const COLORS: HighlightColor[] = ["light", "mid", "invert"];

export function EditMode({ doc, update }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const blockEls = useRef<Map<string, HTMLDivElement>>(new Map());
  const noteEls = useRef<Map<string, HTMLDivElement>>(new Map());

  const [sel, setSel] = useState<SelInfo | null>(null);
  const [notePos, setNotePos] = useState<Record<string, ComputedNote>>({});
  const [arrows, setArrows] = useState<ComputedArrow[]>([]);
  const [tick, setTick] = useState(0);
  const bump = useCallback(() => setTick((t) => t + 1), []);

  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [draggableId, setDraggableId] = useState<string | null>(null);

  const [arrowMode, setArrowMode] = useState(false);
  const [arrowFrom, setArrowFrom] = useState<string | null>(null);

  /* ----------------------------- mutations ------------------------------ */

  const addHighlight = (color: HighlightColor) => {
    if (!sel) return;
    const h: Highlight = {
      id: uid("h"),
      blockId: sel.blockId,
      start: sel.start,
      end: sel.end,
      color,
    };
    update((d) => ({
      ...d,
      annotations: { ...d.annotations, highlights: [...d.annotations.highlights, h] },
    }));
    clearSelection();
  };

  const addNote = (side: "left" | "right") => {
    if (!sel) return;
    const n: MarginNote = {
      id: uid("n"),
      blockId: sel.blockId,
      anchorStart: sel.start,
      anchorEnd: sel.end,
      text: "",
      side,
    };
    update((d) => ({
      ...d,
      annotations: { ...d.annotations, notes: [...d.annotations.notes, n] },
    }));
    clearSelection();
    setTimeout(() => {
      noteEls.current.get(n.id)?.querySelector("textarea")?.focus();
    }, 30);
  };

  const updateNote = (id: string, patch: Partial<MarginNote>) =>
    update((d) => ({
      ...d,
      annotations: {
        ...d.annotations,
        notes: d.annotations.notes.map((n) =>
          n.id === id ? { ...n, ...patch } : n
        ),
      },
    }));

  const deleteNote = (id: string) =>
    update((d) => ({
      ...d,
      annotations: {
        ...d.annotations,
        notes: d.annotations.notes.filter((n) => n.id !== id),
      },
    }));

  const removeHighlight = (hid: string) =>
    update((d) => ({
      ...d,
      annotations: {
        ...d.annotations,
        highlights: d.annotations.highlights.filter((h) => h.id !== hid),
      },
    }));

  const removeArrow = (id: string) =>
    update((d) => ({
      ...d,
      annotations: {
        ...d.annotations,
        arrows: d.annotations.arrows.filter((a) => a.id !== id),
      },
    }));

  const reorder = (from: string, to: string) => {
    if (from === to) return;
    update((d) => {
      const blocks = d.blocks.slice();
      const fi = blocks.findIndex((b) => b.id === from);
      const ti = blocks.findIndex((b) => b.id === to);
      if (fi < 0 || ti < 0) return d;
      const [moved] = blocks.splice(fi, 1);
      blocks.splice(ti, 0, moved);
      return { ...d, blocks };
    });
  };

  /* ----------------------------- selection ------------------------------ */

  function clearSelection() {
    setSel(null);
    window.getSelection()?.removeAllRanges();
  }

  function onBlockMouseUp(blockId: string, contentEl: HTMLElement) {
    const s = window.getSelection();
    if (!s || s.rangeCount === 0 || s.isCollapsed) {
      setSel(null);
      return;
    }
    const range = s.getRangeAt(0);
    if (!contentEl.contains(range.commonAncestorContainer)) {
      setSel(null);
      return;
    }
    let start = offsetWithin(contentEl, range.startContainer, range.startOffset);
    let end = offsetWithin(contentEl, range.endContainer, range.endOffset);
    if (start === end) {
      setSel(null);
      return;
    }
    if (start > end) [start, end] = [end, start];
    setSel({ blockId, start, end, rect: range.getBoundingClientRect() });
  }

  /* ----------------------- measurement of arrows ------------------------ */

  const relRect = (el: Element) => {
    const r = el.getBoundingClientRect();
    const w = wrapRef.current!.getBoundingClientRect();
    return {
      left: r.left - w.left,
      top: r.top - w.top,
      right: r.right - w.left,
      bottom: r.bottom - w.top,
      width: r.width,
      height: r.height,
    };
  };

  const anchorRectFor = (note: MarginNote) => {
    const blockEl = blockEls.current.get(note.blockId);
    if (!blockEl) return null;
    const content = blockEl.querySelector<HTMLElement>(".block-content");
    if (content && note.anchorStart != null && note.anchorEnd != null) {
      const a = locate(content, note.anchorStart);
      const b = locate(content, note.anchorEnd);
      if (a && b) {
        try {
          const range = document.createRange();
          range.setStart(a.node, a.offset);
          range.setEnd(b.node, b.offset);
          const r = range.getBoundingClientRect();
          if (r.width || r.height) {
            const w = wrapRef.current!.getBoundingClientRect();
            return {
              left: r.left - w.left,
              top: r.top - w.top,
              right: r.right - w.left,
              bottom: r.bottom - w.top,
              width: r.width,
              height: r.height,
            };
          }
        } catch {
          /* fall through */
        }
      }
    }
    return relRect(blockEl);
  };

  useLayoutEffect(() => {
    if (!wrapRef.current || !paperRef.current) return;
    const paper = relRect(paperRef.current);
    const NOTE_W = 196;
    const GAP = 26;
    const VPAD = 14;

    // group notes by side, sort by anchor position
    const computed: Record<string, ComputedNote> = {};
    const sides: Record<"left" | "right", { note: MarginNote; y: number }[]> = {
      left: [],
      right: [],
    };
    for (const note of doc.annotations.notes) {
      const ar = anchorRectFor(note);
      if (!ar) continue;
      sides[note.side].push({ note, y: ar.top });
    }
    (["left", "right"] as const).forEach((side) => {
      sides[side].sort((a, b) => a.y - b.y);
      let prevBottom = -Infinity;
      for (const { note, y } of sides[side]) {
        const el = noteEls.current.get(note.id);
        const h = el ? el.offsetHeight : 60;
        let top = Math.max(y - 6, prevBottom + VPAD);
        prevBottom = top + h;
        const left =
          side === "right" ? paper.right + GAP : paper.left - GAP - NOTE_W;
        computed[note.id] = { id: note.id, top, left, side };
      }
    });
    setNotePos(computed);

    // arrows for notes
    const result: ComputedArrow[] = [];
    for (const note of doc.annotations.notes) {
      const cn = computed[note.id];
      const el = noteEls.current.get(note.id);
      const ar = anchorRectFor(note);
      if (!cn || !el || !ar) continue;
      const h = el.offsetHeight;
      const ay = ar.top + ar.height / 2;
      if (note.side === "right") {
        const sx = cn.left;
        const sy = cn.top + h / 2;
        const ex = ar.right;
        const ey = ay;
        result.push(noteArrow(note.id, sx, sy, ex, ey));
      } else {
        const sx = cn.left + NOTE_W;
        const sy = cn.top + h / 2;
        const ex = ar.left;
        const ey = ay;
        result.push(noteArrow(note.id, sx, sy, ex, ey));
      }
    }

    // move arrows (block -> block) drawn through the left gutter
    for (const a of doc.annotations.arrows) {
      const fromEl = blockEls.current.get(a.fromBlockId);
      const toEl = blockEls.current.get(a.toBlockId);
      if (!fromEl || !toEl) continue;
      const fr = relRect(fromEl);
      const tr = relRect(toEl);
      const x = paper.left - 14;
      const sy = fr.top + fr.height / 2;
      const ey = tr.top + (ey0(tr));
      const bow = Math.min(60, 24 + Math.abs(ey - sy) * 0.12);
      const cx = x - bow;
      const d = `M ${paper.left} ${sy} C ${cx} ${sy}, ${cx} ${ey}, ${paper.left} ${ey}`;
      result.push({
        id: a.id,
        d,
        head: { x: paper.left, y: ey, angle: 0 },
        dot: { x: paper.left, y: sy },
        kind: "move",
        label: a.label,
        mid: { x: cx + 4, y: (sy + ey) / 2 },
      });
    }

    setArrows(result);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.blocks, doc.annotations, tick]);

  // remeasure on resize / font load
  useEffect(() => {
    const ro = new ResizeObserver(() => bump());
    if (paperRef.current) ro.observe(paperRef.current);
    window.addEventListener("resize", bump);
    const r = requestAnimationFrame(bump);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", bump);
      cancelAnimationFrame(r);
    };
  }, [bump]);

  // dismiss selection toolbar on outside click / scroll
  useEffect(() => {
    const onScroll = () => setSel(null);
    const stage = document.querySelector(".editor-stage");
    stage?.addEventListener("scroll", onScroll);
    return () => stage?.removeEventListener("scroll", onScroll);
  }, []);

  // Esc cancels arrow-drawing mode
  useEffect(() => {
    if (!arrowMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setArrowMode(false);
        setArrowFrom(null);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [arrowMode]);

  // keyboard shortcuts while text is selected
  useEffect(() => {
    if (!sel) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === "TEXTAREA" || t.tagName === "INPUT")) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "1") addHighlight("light");
      else if (e.key === "2") addHighlight("mid");
      else if (e.key === "3") addHighlight("invert");
      else if (e.key.toLowerCase() === "n") addNote("right");
      else return;
      e.preventDefault();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel]);

  /* ------------------------------ render -------------------------------- */

  function handleBlockClick(e: React.MouseEvent) {
    const target = e.target as HTMLElement;
    const mark = target.closest("mark[data-hid]") as HTMLElement | null;
    if (mark && e.altKey) {
      removeHighlight(mark.dataset.hid!);
    }
  }

  function cancelArrow() {
    setArrowMode(false);
    setArrowFrom(null);
  }

  function onArrowModeClick(blockId: string) {
    if (!arrowMode) return;
    if (!arrowFrom) {
      setArrowFrom(blockId);
    } else if (arrowFrom !== blockId) {
      const arrow: MoveArrow = {
        id: uid("a"),
        fromBlockId: arrowFrom,
        toBlockId: blockId,
      };
      update((d) => ({
        ...d,
        annotations: { ...d.annotations, arrows: [...d.annotations.arrows, arrow] },
      }));
      setArrowFrom(null);
      setArrowMode(false);
    }
  }

  return (
    <div className="edit-shell">
      <div className="edit-toolbar">
        {arrowMode ? (
          <span className="edit-hint arrowing">
            {arrowFrom
              ? "Now click the paragraph it should point to."
              : "Click the paragraph you want to move…"}{" "}
            <button className="link-btn" onClick={cancelArrow}>
              cancel (Esc)
            </button>
          </span>
        ) : (
          <span className="edit-hint">
            Select text to highlight or add a note · drag <b>⠿</b> to move a
            paragraph · Alt-click a highlight to remove it
          </span>
        )}
        <button
          className={`arrow-btn ${arrowMode ? "on" : ""}`}
          onClick={() => {
            if (arrowMode) cancelArrow();
            else setArrowMode(true);
          }}
        >
          {arrowMode ? "Cancel arrow" : "↳ Draw arrow"}
        </button>
      </div>

      <div className="edit-stage-inner" ref={wrapRef}>
        <svg className="arrow-layer">
          <defs>
            <marker
              id="ah"
              markerWidth="9"
              markerHeight="9"
              refX="6"
              refY="4.5"
              orient="auto"
            >
              <path d="M0,0 L9,4.5 L0,9 z" fill="#111" />
            </marker>
          </defs>
          {arrows.map((a) => (
            <g key={a.id} className={`arrow arrow-${a.kind}`}>
              <circle cx={a.dot.x} cy={a.dot.y} r="3.2" fill="#111" />
              <path
                d={a.d}
                fill="none"
                stroke="#111"
                strokeWidth="1.3"
                markerEnd="url(#ah)"
                onClick={() => a.kind === "move" && removeArrow(a.id)}
                style={{ cursor: a.kind === "move" ? "pointer" : "default" }}
              />
              {a.label && a.mid && (
                <text x={a.mid.x} y={a.mid.y} className="arrow-label">
                  {a.label}
                </text>
              )}
            </g>
          ))}
        </svg>

        <div className="paper edit-paper" ref={paperRef} onClick={handleBlockClick}>
          {doc.blocks.map((block) => (
            <BlockView
              key={block.id}
              block={block}
              highlights={doc.annotations.highlights.filter(
                (h) => h.blockId === block.id
              )}
              register={(el) => {
                if (el) blockEls.current.set(block.id, el);
                else blockEls.current.delete(block.id);
              }}
              onMouseUp={onBlockMouseUp}
              dragging={dragId === block.id}
              over={overId === block.id}
              draggable={draggableId === block.id}
              arrowMode={arrowMode}
              arrowFrom={arrowFrom === block.id}
              onArrowPick={() => onArrowModeClick(block.id)}
              onHandleDown={() => setDraggableId(block.id)}
              onDragStart={() => setDragId(block.id)}
              onDragEnter={() => setOverId(block.id)}
              onDragEnd={() => {
                if (dragId && overId) reorder(dragId, overId);
                setDragId(null);
                setOverId(null);
                setDraggableId(null);
              }}
            />
          ))}
        </div>

        {/* margin notes */}
        {doc.annotations.notes.map((note) => {
          const pos = notePos[note.id];
          return (
            <div
              key={note.id}
              ref={(el) => {
                if (el) noteEls.current.set(note.id, el);
                else noteEls.current.delete(note.id);
              }}
              className={`margin-note side-${note.side}`}
              style={
                pos
                  ? { top: pos.top, left: pos.left }
                  : { top: 0, left: -9999 }
              }
            >
              <textarea
                className="note-text"
                value={note.text}
                placeholder="note…"
                rows={1}
                onChange={(e) => {
                  updateNote(note.id, { text: e.target.value });
                  autoSize(e.target);
                }}
                ref={(t) => t && autoSize(t)}
              />
              <div className="note-tools">
                <button
                  title="Swap side"
                  onClick={() =>
                    updateNote(note.id, {
                      side: note.side === "right" ? "left" : "right",
                    })
                  }
                >
                  ⇄
                </button>
                <button title="Delete note" onClick={() => deleteNote(note.id)}>
                  ×
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* selection toolbar */}
      {sel && (
        <div
          className="sel-toolbar"
          style={{
            left: sel.rect.left + sel.rect.width / 2,
            top: sel.rect.top - 46,
          }}
          onMouseDown={(e) => e.preventDefault()}
        >
          {COLORS.map((c) => (
            <button
              key={c}
              className={`swatch sw-${c}`}
              title={`Highlight ${c}`}
              onClick={() => addHighlight(c)}
            />
          ))}
          <span className="sep" />
          <button className="tb" onClick={() => addNote("right")}>
            + note →
          </button>
          <button className="tb" onClick={() => addNote("left")}>
            ← note
          </button>
        </div>
      )}
    </div>
  );
}

function ey0(r: { height: number }) {
  return r.height / 2;
}

function noteArrow(
  id: string,
  sx: number,
  sy: number,
  ex: number,
  ey: number
): ComputedArrow {
  const dx = ex - sx;
  const c1x = sx + dx * 0.45;
  const c2x = sx + dx * 0.55;
  const d = `M ${sx} ${sy} C ${c1x} ${sy}, ${c2x} ${ey}, ${ex} ${ey}`;
  return {
    id,
    d,
    head: { x: ex, y: ey, angle: 0 },
    dot: { x: sx, y: sy },
    kind: "note",
  };
}

/* --------------------------- single block ----------------------------- */

interface BlockProps {
  block: Block;
  highlights: Highlight[];
  register: (el: HTMLDivElement | null) => void;
  onMouseUp: (blockId: string, content: HTMLElement) => void;
  dragging: boolean;
  over: boolean;
  draggable: boolean;
  arrowMode: boolean;
  arrowFrom: boolean;
  onArrowPick: () => void;
  onHandleDown: () => void;
  onDragStart: () => void;
  onDragEnter: () => void;
  onDragEnd: () => void;
}

function BlockView(props: BlockProps) {
  const { block, highlights } = props;
  const contentRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    el.innerHTML = renderBlockHTML(block);
    applyHighlights(el, highlights);
  }, [block.text, block.type, highlights]);

  return (
    <div
      ref={(el) => props.register(el)}
      className={`block ${props.dragging ? "is-dragging" : ""} ${
        props.over ? "is-over" : ""
      } ${props.arrowFrom ? "arrow-from" : ""} ${
        props.arrowMode ? "arrow-target" : ""
      }`}
      draggable={props.draggable}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        props.onDragStart();
      }}
      onDragEnter={props.onDragEnter}
      onDragOver={(e) => e.preventDefault()}
      onDragEnd={props.onDragEnd}
      onClick={() => props.arrowMode && props.onArrowPick()}
    >
      <span
        className="drag-handle"
        title="Drag to move paragraph"
        onMouseDown={props.onHandleDown}
      >
        ⠿
      </span>
      <div
        ref={contentRef}
        className="block-content"
        onMouseUp={() =>
          contentRef.current &&
          props.onMouseUp(block.id, contentRef.current)
        }
      />
    </div>
  );
}

/* ------------------------------ helpers ------------------------------- */

function locate(
  root: HTMLElement,
  target: number
): { node: Node; offset: number } | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let pos = 0;
  let last: Text | null = null;
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    last = node;
    const len = (node.nodeValue || "").length;
    if (pos + len >= target) return { node, offset: target - pos };
    pos += len;
  }
  if (last) return { node: last, offset: (last.nodeValue || "").length };
  return null;
}

function autoSize(t: HTMLTextAreaElement) {
  t.style.height = "auto";
  t.style.height = Math.max(20, t.scrollHeight) + "px";
}
