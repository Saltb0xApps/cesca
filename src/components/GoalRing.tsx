// A small progress ring for the editor bar showing today's writing-goal
// progress while you draft. Monochrome, updates as you type (on autosave).
export function GoalRing({ today, goal }: { today: number; goal: number }) {
  const pct = Math.max(0, Math.min(1, today / Math.max(1, goal)));
  const met = today >= goal;
  const r = 9;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct);
  return (
    <span
      className="goal-ring"
      title={`Today: ${today.toLocaleString()} / ${goal.toLocaleString()} words${
        met ? " — goal met" : ""
      }`}
    >
      <svg width="24" height="24" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r={r} fill="none" stroke="#3a3a3a" strokeWidth="2.5" />
        <circle
          cx="12"
          cy="12"
          r={r}
          fill="none"
          stroke="#fff"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform="rotate(-90 12 12)"
          style={{ transition: "stroke-dashoffset 0.35s ease" }}
        />
        {met && (
          <path
            d="M8.2 12.2 L11 15 L16 9.4"
            fill="none"
            stroke="#fff"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </span>
  );
}
