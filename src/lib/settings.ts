export type FontKey = "mono" | "serif" | "sans";
export type PageKey = "narrow" | "a4" | "letter" | "wide";

export interface Settings {
  font: FontKey;
  size: number; // prose font size in px
  leading: number; // line-height multiplier
  page: PageKey; // page width preset
  fullPage: boolean; // full-bleed: paper fills the screen
}

export const DEFAULTS: Settings = {
  font: "mono",
  size: 16,
  leading: 1.9,
  page: "a4",
  fullPage: false,
};

export const FONTS: Record<FontKey, { label: string; stack: string }> = {
  mono: {
    label: "Typewriter",
    stack: `"American Typewriter", "Courier Prime", "Courier New", "Courier", "DejaVu Sans Mono", ui-monospace, monospace`,
  },
  serif: {
    label: "Serif",
    stack: `"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, "Times New Roman", serif`,
  },
  sans: {
    label: "Sans",
    stack: `"Helvetica Neue", Helvetica, Arial, system-ui, sans-serif`,
  },
};

export const PAGES: Record<PageKey, { label: string; width: number }> = {
  narrow: { label: "Narrow", width: 560 },
  a4: { label: "A4", width: 720 },
  letter: { label: "Letter", width: 800 },
  wide: { label: "Wide", width: 920 },
};

const KEY = "margins.settings.v1";

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { ...DEFAULTS };
}

export function saveSettings(s: Settings) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

// Push the settings into CSS custom properties used across the app.
export function applySettings(s: Settings) {
  const root = document.documentElement;
  root.style.setProperty("--prose-font", FONTS[s.font].stack);
  root.style.setProperty("--prose-size", `${s.size}px`);
  root.style.setProperty("--prose-leading", `${s.leading}`);
  root.style.setProperty("--page-w", s.fullPage ? "100%" : `${PAGES[s.page].width}px`);
  root.dataset.fullpage = s.fullPage ? "1" : "0";
}
