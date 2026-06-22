const MOD = navigator.platform.toLowerCase().includes("mac") ? "⌘" : "Ctrl";

const GROUPS: { title: string; rows: [string, string][] }[] = [
  {
    title: "Anywhere",
    rows: [
      [`${MOD} E`, "Switch Write / Edit mode"],
      [`${MOD} S`, "Save a version"],
      [`${MOD} ,`, "Open formatting settings"],
      [`${MOD} /`, "Show / hide this help"],
      ["Esc", "Close panels"],
    ],
  },
  {
    title: "Write mode",
    rows: [
      [`${MOD} B`, "Bold the selection"],
      [`${MOD} I`, "Italic the selection"],
      [`${MOD} K`, "Make a link"],
      [`${MOD} 1 / 2 / 3`, "Heading level on the line"],
      [`${MOD} ⇧ .`, "Quote the line"],
      [`${MOD} ⇧ 8`, "Bullet the line"],
    ],
  },
  {
    title: "Edit mode (with text selected)",
    rows: [
      ["1 / 2 / 3", "Highlight: light · mid · invert"],
      ["N", "Add a margin note"],
      ["Alt-click", "Remove a highlight"],
      ["Drag ⠿", "Move a paragraph"],
    ],
  },
];

export function Shortcuts({ onClose }: { onClose: () => void }) {
  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="shortcuts" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <h2>Keyboard shortcuts</h2>
          <button className="ghost" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="sc-groups">
          {GROUPS.map((g) => (
            <div key={g.title} className="sc-group">
              <h3>{g.title}</h3>
              {g.rows.map(([k, label]) => (
                <div key={k} className="sc-row">
                  <span className="sc-label">{label}</span>
                  <kbd>{k}</kbd>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
