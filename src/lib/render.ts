import type { Block, Highlight } from "../types";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Minimal, safe inline markdown -> HTML. Operates on already-escaped text so
// the only HTML produced is our own tags. Visible text excludes the markers,
// which keeps highlight offsets aligned with what the reader sees.
function inline(text: string): string {
  let s = escapeHtml(text);
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
  s = s.replace(
    /\[([^\]]+)\]\((https?:[^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noreferrer">$1</a>'
  );
  return s;
}

// Render a block's prose to HTML. The visible text content is the prose only
// (markdown markers are stripped), which is the coordinate space highlights and
// notes are anchored in.
export function renderBlockHTML(block: Block): string {
  const text = block.text;
  if (block.type === "h") {
    const m = text.match(/^(#{1,6})\s+(.*)$/s);
    const level = m ? m[1].length : 2;
    const body = m ? m[2] : text.replace(/^#{1,6}\s*/, "");
    return `<span class="h h${level}">${inline(body)}</span>`;
  }
  if (block.type === "quote") {
    const body = text
      .split("\n")
      .map((l) => l.replace(/^>\s?/, ""))
      .join("\n");
    return `<span class="bq">${inline(body)}</span>`;
  }
  if (block.type === "list") {
    const items = text
      .split("\n")
      .filter((l) => l.trim())
      .map((l) => `<li>${inline(l.replace(/^([-*]|\d+\.)\s+/, ""))}</li>`)
      .join("");
    return `<ul class="list">${items}</ul>`;
  }
  return inline(text);
}

/* ---------- DOM-level highlight application (visible-text coords) --------- */

export function offsetWithin(
  root: HTMLElement,
  node: Node,
  offset: number
): number {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let pos = 0;
  while (walker.nextNode()) {
    const cur = walker.currentNode;
    if (cur === node) return pos + offset;
    pos += (cur.nodeValue || "").length;
  }
  return pos;
}

export function applyHighlights(root: HTMLElement, highlights: Highlight[]) {
  for (const h of highlights) wrapRange(root, h.start, h.end, h.color, h.id);
}

function wrapRange(
  root: HTMLElement,
  start: number,
  end: number,
  color: string,
  id: string
) {
  if (end <= start) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  let pos = 0;
  for (const node of nodes) {
    const len = (node.nodeValue || "").length;
    const a = pos;
    const b = pos + len;
    pos = b;
    const os = Math.max(a, start);
    const oe = Math.min(b, end);
    if (oe <= os) continue;
    let target = node;
    const localStart = os - a;
    const localEnd = oe - a;
    if (localStart > 0) target = target.splitText(localStart);
    if (localEnd - localStart < (target.nodeValue || "").length) {
      target.splitText(localEnd - localStart);
    }
    const mark = document.createElement("mark");
    mark.className = `hl hl-${color}`;
    mark.dataset.hid = id;
    target.parentNode!.replaceChild(mark, target);
    mark.appendChild(target);
  }
}
