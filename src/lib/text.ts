import type { Block, BlockType, Doc } from "../types";

let counter = 0;
export function uid(prefix = "b"): string {
  counter += 1;
  return prefix + Date.now().toString(36) + (counter).toString(36) + Math.random().toString(36).slice(2, 5);
}

export function guessType(text: string): BlockType {
  if (/^#{1,6}\s/.test(text)) return "h";
  if (/^>\s/.test(text)) return "quote";
  if (/^([-*]|\d+\.)\s/m.test(text)) return "list";
  return "p";
}

export function blocksToText(blocks: Block[]): string {
  return blocks.map((b) => b.text).join("\n\n");
}

export function splitText(text: string): string[] {
  const t = text.replace(/\s+$/, "");
  if (!t.trim()) return [""];
  return t.split(/\n{2,}/).map((s) => s.replace(/\s+$/, ""));
}

// Re-derive blocks from edited text, preserving ids (and thus annotations)
// for paragraphs whose text is unchanged.
export function reconcileBlocks(oldBlocks: Block[], text: string): Block[] {
  const texts = splitText(text);
  const pool = new Map<string, Block[]>();
  for (const b of oldBlocks) {
    const arr = pool.get(b.text) || [];
    arr.push(b);
    pool.set(b.text, arr);
  }
  return texts.map((t) => {
    const reuse = pool.get(t);
    if (reuse && reuse.length) {
      const b = reuse.shift()!;
      return { ...b, text: t, type: guessType(t) };
    }
    return { id: uid(), type: guessType(t), text: t };
  });
}

// Drop annotations whose anchor block no longer exists.
export function pruneAnnotations(doc: Doc): Doc {
  const ids = new Set(doc.blocks.map((b) => b.id));
  return {
    ...doc,
    annotations: {
      highlights: doc.annotations.highlights.filter((h) => ids.has(h.blockId)),
      notes: doc.annotations.notes.filter((n) => ids.has(n.blockId)),
      arrows: doc.annotations.arrows.filter(
        (a) => ids.has(a.fromBlockId) && ids.has(a.toBlockId)
      ),
    },
  };
}

export function plainExcerpt(doc: Doc, len = 200): string {
  const first =
    doc.blocks.find((b) => b.type === "p" && b.text.trim()) || doc.blocks[0];
  return (first?.text || "").replace(/[#>*_`-]/g, "").trim().slice(0, len);
}
