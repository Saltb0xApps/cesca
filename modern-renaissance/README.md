# The Modern Renaissance — website

A static one-page site for The Modern Renaissance, structured after
[social-impact-capital.com](https://social-impact-capital.com/): announcement
ticker, toile-framed hero, manifesto, engraved image breaks, big statement,
six-card gatherings grid, full-bleed CTA band, community, voices (social
proof), letters list, and a subscribe footer.

Design language: paper `#fcfcfc`, ink `#000`, ultramarine `#2a2ecd`,
pale blue `#e1e7f5`; Times-style serif display with a grotesque sans body.
All illustrations are original inline SVG "engravings" (armillary sphere,
da Vinci ornithopter, laurels, swallows, quill, radiant sun) defined once in
`index.html` and reused via `<use>` — recolorable through `currentColor`.

## Run

No build step. Open `index.html` directly, or serve the folder:

```sh
npx serve modern-renaissance
```

## Customise

- **Copy** — all text lives in `index.html`.
- **Colors / fonts** — CSS custom properties at the top of `css/style.css`.
- **Ticker** — edit the repeated line in the `.ticker` block.
- **Subscribe form** — front-end only; point it at your Substack embed in
  `js/main.js`.
- **Links** — RSVP/Join links currently point at `#join`; swap in Luma and
  Substack URLs when ready.
