import { useEffect, useRef, useState } from "react";

export function WriteMode({
  text,
  onChange,
}: {
  text: string;
  onChange: (t: string) => void;
}) {
  const [local, setLocal] = useState(text);
  const lastEmitted = useRef(text);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (text !== lastEmitted.current) {
      setLocal(text);
      lastEmitted.current = text;
    }
  }, [text]);

  function emit(v: string) {
    setLocal(v);
    lastEmitted.current = v;
    onChange(v);
  }

  // Apply a transform to the textarea, preserving a sensible selection.
  function transform(fn: (s: string, a: number, b: number) => {
    text: string;
    a: number;
    b: number;
  }) {
    const ta = ref.current;
    if (!ta) return;
    const { text: next, a, b } = fn(ta.value, ta.selectionStart, ta.selectionEnd);
    emit(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(a, b);
    });
  }

  function wrap(marker: string) {
    transform((s, a, b) => {
      const sel = s.slice(a, b) || "text";
      const next = s.slice(0, a) + marker + sel + marker + s.slice(b);
      return { text: next, a: a + marker.length, b: a + marker.length + sel.length };
    });
  }

  function link() {
    transform((s, a, b) => {
      const sel = s.slice(a, b) || "text";
      const ins = `[${sel}](url)`;
      const next = s.slice(0, a) + ins + s.slice(b);
      const urlStart = a + sel.length + 3;
      return { text: next, a: urlStart, b: urlStart + 3 };
    });
  }

  function linePrefix(marker: string) {
    transform((s, a) => {
      const lineStart = s.lastIndexOf("\n", a - 1) + 1;
      const rest = s.slice(lineStart);
      const stripped = rest.replace(/^(#{1,6}\s|>\s|[-*]\s)/, "");
      const next = s.slice(0, lineStart) + marker + stripped;
      const delta = marker.length - (rest.length - stripped.length);
      return { text: next, a: a + delta, b: a + delta };
    });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const mod = e.metaKey || e.ctrlKey;
    if (!mod) return;
    const k = e.key.toLowerCase();
    if (k === "b") {
      e.preventDefault();
      wrap("**");
    } else if (k === "i") {
      e.preventDefault();
      wrap("*");
    } else if (k === "k") {
      e.preventDefault();
      link();
    } else if (k === "1") {
      e.preventDefault();
      linePrefix("# ");
    } else if (k === "2") {
      e.preventDefault();
      linePrefix("## ");
    } else if (k === "3") {
      e.preventDefault();
      linePrefix("### ");
    } else if (e.shiftKey && (k === "." || k === ">")) {
      e.preventDefault();
      linePrefix("> ");
    } else if (e.shiftKey && (k === "8" || k === "*")) {
      e.preventDefault();
      linePrefix("- ");
    }
  }

  const words = local.trim() ? local.trim().split(/\s+/).length : 0;

  return (
    <div className="paper-frame">
      <div className="paper write-paper">
        <textarea
          ref={ref}
          className="writer"
          value={local}
          spellCheck
          onKeyDown={onKeyDown}
          placeholder={
            "Start writing.\n\nLeave a blank line between paragraphs — each one becomes a moveable block in Edit mode.\n\n# A line starting with # becomes a heading."
          }
          onChange={(e) => emit(e.target.value)}
        />
      </div>
      <div className="write-foot">
        <span>{words} words</span>
        <span className="write-hint">
          ⌘B bold · ⌘I italic · ⌘1/2/3 heading · ⌘/ for all shortcuts
        </span>
      </div>
    </div>
  );
}
