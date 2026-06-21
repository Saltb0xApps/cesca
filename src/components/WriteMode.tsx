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

  // Re-sync only when the text changes for an external reason (load / restore).
  useEffect(() => {
    if (text !== lastEmitted.current) {
      setLocal(text);
      lastEmitted.current = text;
    }
  }, [text]);

  const words = local.trim() ? local.trim().split(/\s+/).length : 0;

  return (
    <div className="paper-frame">
      <div className="paper write-paper">
        <textarea
          ref={ref}
          className="writer"
          value={local}
          spellCheck
          placeholder={
            "Start writing.\n\nLeave a blank line between paragraphs — each one becomes a moveable block in Edit mode.\n\n# A line starting with # becomes a heading."
          }
          onChange={(e) => {
            const v = e.target.value;
            setLocal(v);
            lastEmitted.current = v;
            onChange(v);
          }}
        />
      </div>
      <div className="write-foot">
        <span>{words} words</span>
        <span className="write-hint">
          blank line = new block · # = heading · &gt; = quote · - = list
        </span>
      </div>
    </div>
  );
}
