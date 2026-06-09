# The Modern Renaissance — website

A static one-page site for The Modern Renaissance. The page structure follows
[social-impact-capital.com](https://social-impact-capital.com/) — announcement
ticker, full-screen artwork hero, manifesto, engraved image breaks, big
statement, six-card gatherings grid, full-bleed CTA band, community, world
map, voices (social proof), letters list, and a subscribe footer — while the
visual language is the original "manuscript" theme: ivory paper `#f1eee4`,
ink `#1b1d1c`, brand teal `#00706e`.

Graphics:

- `images/hero.png` — the engraved green toile of Renaissance figures with
  modern tools (the original hero artwork).
- `images/mark.png` — the circular brand mark, used in the nav.
- Inline SVG "engravings" (armillary sphere, da Vinci ornithopter, laurels,
  swallows, quill, radiant sun) defined once in `index.html`, reused via
  `<use>`, and tinted through `currentColor`.
- `js/portolan.js` + `js/world-land.js` — an antique portolan world chart
  drawn on canvas (vellum, rhumb lines, compass roses, blackletter ocean
  names) with member cities as interactive ports. It reads its colors from
  the CSS variables, so it follows the theme.

## Run

No build step. Open `index.html` directly, or serve the folder:

```sh
npx serve modern-renaissance
```

## Customise

- **Copy** — all text lives in `index.html`.
- **Colors / fonts** — CSS custom properties at the top of `css/style.css`.
- **Map cities** — the `CITIES` array at the top of `js/portolan.js`
  (`[name, lat, lon, members, sampleName]`).
- **Ticker** — edit the repeated line in the `.ticker` block.
- **Subscribe form** — front-end only; point it at your Substack embed in
  `js/main.js`.
- **Links** — RSVP/Join links currently point at `#join`; swap in Luma and
  Substack URLs when ready.
