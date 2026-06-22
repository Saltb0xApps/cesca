import type { Settings, FontKey, PageKey } from "../lib/settings";
import { FONTS, PAGES } from "../lib/settings";

export function SettingsMenu({
  settings,
  onChange,
  onMakeDefault,
  onClose,
}: {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  onMakeDefault: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="popover-scrim" onClick={onClose} />
      <div className="popover settings-pop" role="dialog">
        <div className="set-head">Formatting · this essay</div>
        <div className="set-row">
          <span className="set-label">Typeface</span>
          <div className="set-seg">
            {(Object.keys(FONTS) as FontKey[]).map((k) => (
              <button
                key={k}
                className={settings.font === k ? "on" : ""}
                onClick={() => onChange({ font: k })}
              >
                {FONTS[k].label}
              </button>
            ))}
          </div>
        </div>

        <div className="set-row">
          <span className="set-label">Text size</span>
          <div className="stepper">
            <button onClick={() => onChange({ size: Math.max(11, settings.size - 1) })}>
              −
            </button>
            <span>{settings.size}px</span>
            <button onClick={() => onChange({ size: Math.min(28, settings.size + 1) })}>
              +
            </button>
          </div>
        </div>

        <div className="set-row">
          <span className="set-label">Line spacing</span>
          <div className="stepper">
            <button
              onClick={() =>
                onChange({ leading: round(Math.max(1.2, settings.leading - 0.1)) })
              }
            >
              −
            </button>
            <span>{settings.leading.toFixed(1)}</span>
            <button
              onClick={() =>
                onChange({ leading: round(Math.min(2.6, settings.leading + 0.1)) })
              }
            >
              +
            </button>
          </div>
        </div>

        <div className="set-row">
          <span className="set-label">Page width</span>
          <div className="set-seg">
            {(Object.keys(PAGES) as PageKey[]).map((k) => (
              <button
                key={k}
                className={settings.page === k && !settings.fullPage ? "on" : ""}
                disabled={settings.fullPage}
                onClick={() => onChange({ page: k })}
              >
                {PAGES[k].label}
              </button>
            ))}
          </div>
        </div>

        <div className="set-row">
          <span className="set-label">Full page</span>
          <button
            className={`toggle ${settings.fullPage ? "on" : ""}`}
            onClick={() => onChange({ fullPage: !settings.fullPage })}
          >
            <span className="knob" />
          </button>
        </div>

        <button className="set-default" onClick={onMakeDefault}>
          Use these for new essays
        </button>
        <div className="set-foot">
          These settings apply to this essay only and are saved with it.
        </div>
      </div>
    </>
  );
}

function round(n: number) {
  return Math.round(n * 10) / 10;
}
