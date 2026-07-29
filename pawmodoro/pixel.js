'use strict';

/* Pixel rendering for Pawmodoro: a 5x7 font, sprite helpers, and Noodle
   himself. Everything is emitted as SVG <rect>s on an integer grid with
   shape-rendering:crispEdges — no fonts, no images. */

const PIX = (() => {
  /* ---------------- 5x7 font ---------------- */
  const F = {
    A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
    B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
    C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
    D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
    E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
    F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
    G: ['.####', '#....', '#....', '#.###', '#...#', '#...#', '.###.'],
    H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
    I: ['###', '.#.', '.#.', '.#.', '.#.', '.#.', '###'],
    J: ['....#', '....#', '....#', '....#', '#...#', '#...#', '.###.'],
    K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
    L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
    M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
    N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
    O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
    P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
    Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
    R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
    S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
    T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
    U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
    V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
    W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
    X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
    Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
    Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
    0: ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
    1: ['.#.', '##.', '.#.', '.#.', '.#.', '.#.', '###'],
    2: ['.###.', '#...#', '....#', '..##.', '.#...', '#....', '#####'],
    3: ['.###.', '#...#', '....#', '..##.', '....#', '#...#', '.###.'],
    4: ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
    5: ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
    6: ['.###.', '#....', '#....', '####.', '#...#', '#...#', '.###.'],
    7: ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
    8: ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
    9: ['.###.', '#...#', '#...#', '.####', '....#', '....#', '.###.'],
    ':': ['.', '#', '#', '.', '#', '#', '.'],
    '!': ['#', '#', '#', '#', '#', '.', '#'],
    '.': ['.', '.', '.', '.', '.', '.', '#'],
    '-': ['...', '...', '...', '###', '...', '...', '...'],
    ' ': ['..', '..', '..', '..', '..', '..', '..'],
  };

  /* Merge horizontal runs of solid cells in one row into single rects. */
  function runs(row, y, x0, solid) {
    const out = [];
    let start = -1;
    for (let x = 0; x <= row.length; x++) {
      const on = x < row.length && (solid ? row[x] !== '.' : false);
      if (on && start < 0) start = x;
      if (!on && start >= 0) {
        out.push({ x: x0 + start, y, w: x - start, ch: row[start] });
        start = -1;
      }
    }
    return out;
  }

  /* Rects for a sprite map; each distinct letter can get its own fill. */
  function spriteRects(rows, x0 = 0, y0 = 0) {
    const out = [];
    rows.forEach((row, j) => {
      let start = -1;
      for (let x = 0; x <= row.length; x++) {
        const ch = x < row.length ? row[x] : '.';
        const prev = start >= 0 ? row[start] : null;
        if (ch !== '.' && (start < 0 || ch !== prev)) {
          if (start >= 0) out.push({ x: x0 + start, y: y0 + j, w: x - start, ch: prev });
          start = x;
        } else if (ch === '.' && start >= 0) {
          out.push({ x: x0 + start, y: y0 + j, w: x - start, ch: prev });
          start = -1;
        }
      }
    });
    return out;
  }

  function rectsToSVG(rects, palette) {
    return rects
      .map((r) => `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="1" fill="${palette[r.ch] || 'currentColor'}"/>`)
      .join('');
  }

  /* ---------------- pixel text ---------------- */
  function textSVG(text, cls = '') {
    const chars = String(text).toUpperCase().split('');
    let x = 0;
    const rects = [];
    chars.forEach((c) => {
      const glyph = F[c] || F[' '];
      glyph.forEach((row, j) => rects.push(...runs(row, j, x, true)));
      x += glyph[0].length + 1;
    });
    const w = Math.max(1, x - 1);
    const body = rects.map((r) => `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="1"/>`).join('');
    return `<svg class="pix ${cls}" viewBox="0 0 ${w} 7" shape-rendering="crispEdges" aria-hidden="true" fill="currentColor">${body}</svg>`;
  }

  /* Sets element content to sr-only text + pixel-rendered SVG. */
  function setText(el, text, cls = '') {
    if (el.dataset.pix === text) return;
    el.dataset.pix = text;
    const span = document.createElement('span');
    span.className = 'sr-only';
    span.textContent = text;
    el.innerHTML = '';
    el.appendChild(span);
    el.insertAdjacentHTML('beforeend', textSVG(text, cls));
  }

  function spriteSVG(rows, palette, cls = '') {
    const w = Math.max(...rows.map((r) => r.length));
    const h = rows.length;
    return `<svg class="pix ${cls}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges" aria-hidden="true">${rectsToSVG(spriteRects(rows), palette)}</svg>`;
  }

  /* ---------------- small sprites ---------------- */
  const BONE = ['##....##', '########', '########', '##....##'];

  const ICONS = {
    gear: [
      '...###...',
      '.#.###.#.',
      '.#######.',
      '###...###',
      '###.#.###',
      '###...###',
      '.#######.',
      '.#.###.#.',
      '...###...',
    ],
    reset: [
      '..#####..',
      '.#.....#.',
      '#.......#',
      '#........',
      '###......',
      '.#......#',
      '#.......#',
      '.#.....#.',
      '..#####..',
    ],
    skip: [
      '#......##',
      '##.....##',
      '###....##',
      '####...##',
      '#####..##',
      '####...##',
      '###....##',
      '##.....##',
      '#......##',
    ],
  };

  /* ---------------- Noodle ---------------- */
  /* Palette letters: b body, d dark (ear/tail/far legs), n nose/eye,
     t tan paws, c collar (phase accent), g gold tag, w eye glint. */
  const DOG_PALETTE = {
    b: 'var(--dog)',
    d: 'var(--dog-dark)',
    n: 'var(--dog-nose)',
    t: 'var(--dog-tan)',
    c: 'var(--accent)',
    g: 'var(--gold)',
    w: 'var(--glint)',
  };

  const H = 25; // dog grid height (rows 0..24), feet on row 24

  function rows25(map, width) {
    const blank = '.'.repeat(width);
    const out = [];
    for (let j = 0; j < H; j++) out.push(map[j] || blank);
    return out;
  }

  /* Standing pose. Tail (6 wide) | rear (12 wide) | mid (repeat) | front (20 wide). */
  const TAIL_UP = rows25({
    4:  'dd....',
    5:  'ddd...',
    6:  '.ddd..',
    7:  '..ddd.',
    8:  '...ddd',
    9:  '....dd',
    10: '.....d',
    11: '.....d',
  }, 6);
  const TAIL_DOWN = rows25({
    7:  'dd....',
    8:  'ddd...',
    9:  '.ddd..',
    10: '..ddd.',
    11: '...ddd',
    12: '....dd',
  }, 6);

  const REAR = rows25({
    10: '.bbbbbbbbbbb',
    11: 'bbbbbbbbbbbb',
    12: 'bbbbbbbbbbbb',
    13: 'bbbbbbbbbbbb',
    14: 'bbbbbbbbbbbb',
    15: 'bbbbbbbbbbbb',
    16: 'bbbbbbbbbbbb',
    17: '.bbbbbbbbbbb',
    18: '..bbb..ddd..',
    19: '..bbb..ddd..',
    20: '..bbb..ddd..',
    21: '..bbb..ddd..',
    22: '..bbb..ddd..',
    23: '..bbb..ddd..',
    24: '..tttt.dddd.',
  }, 12);

  const MID_STAND = { from: 10, to: 17, ch: 'b' };

  const FRONT_BASE = [
    /* 0  */ '.......bbbbbbbb.....',
    /* 1  */ '......dddbbbbbb.....',
    /* 2  */ '......dddbbbbbb.....',
    /* 3  */ '......dddbbbnwb.....',
    /* 4  */ '......dddbbbnnbbbnn.',
    /* 5  */ '......dddbbbbbbbbnn.',
    /* 6  */ '......dddbbbbbbbb...',
    /* 7  */ '......dddbbbbbb.....',
    /* 8  */ '.......bbbbbbb......',
    /* 9  */ '.....ccccccc........',
    /* 10 */ 'bbbbbbbbgbbb........',
    /* 11 */ 'bbbbbbbbbbb.........',
    /* 12 */ 'bbbbbbbbbbb.........',
    /* 13 */ 'bbbbbbbbbbb.........',
    /* 14 */ 'bbbbbbbbbbb.........',
    /* 15 */ 'bbbbbbbbbbb.........',
    /* 16 */ 'bbbbbbbbbbb.........',
    /* 17 */ '.bbbbbbbbb..........',
    /* 18 */ '..ddd..bbb..........',
    /* 19 */ '..ddd..bbb..........',
    /* 20 */ '..ddd..bbb..........',
    /* 21 */ '..ddd..bbb..........',
    /* 22 */ '..ddd..bbb..........',
    /* 23 */ '..ddd..bbb..........',
    /* 24 */ '.dddd..tttt.........',
  ];

  /* Sleeping pose: everything lies on the ground. */
  const TAIL_SLEEP = rows25({
    21: 'dd....',
    22: '.ddd..',
    23: '...ddd',
  }, 6);

  const REAR_SLEEP = rows25({
    18: '.bbbbbbbbbbb',
    19: 'bbbbbbbbbbbb',
    20: 'bbbbbbbbbbbb',
    21: 'bbbbbbbbbbbb',
    22: 'bbbbbbbbbbbb',
    23: 'bbbbbbbbbbbb',
    24: '.bbbbbbbbbbb',
  }, 12);

  const MID_SLEEP = { from: 18, to: 24, ch: 'b' };

  const FRONT_SLEEP = rows25({
    16: '.......bbbbbbbb.....',
    17: '......dddbbbbbb.....',
    18: 'bbbbbcdddbbbbbb.....',
    19: 'bbbbbcdddbbbnnb.....',
    20: 'bbbbbcdddbbbbbbbbnn.',
    21: 'bbbbbcdddbbbbbbbbnn.',
    22: 'bbbbbcdddbbbbbbbb...',
    23: 'bbbbbbdddbbbbbb.....',
    24: '.bbbbbbbbbbbbb......',
  }, 20);

  /* Mini Z sprites for snoozing. */
  const Z_SMALL = ['###', '..#', '.#.', '###'];
  const Z_MED = ['####', '...#', '..#.', '.#..', '####'];
  const Z_BIG = F.Z;

  const GEOM = {
    sceneW: 92,
    sceneH: 34,
    dogX: 4,     // scene x of tail column 0
    dogY: 6,     // scene y of dog row 0
    tailW: 6,
    rearW: 12,
    frontW: 20,
    kMax: 39,    // extra body columns at 100% focus
    boneX: 80,
    boneY: 27,
    groundY: 31,
  };

  function withEye(closed) {
    if (!closed) return FRONT_BASE;
    const rows = FRONT_BASE.slice();
    rows[3] = rows[3].slice(0, 12) + 'bb' + rows[3].slice(14);
    rows[4] = rows[4].slice(0, 12) + 'nn' + rows[4].slice(14);
    return rows;
  }

  /* Build the full dog as SVG inner markup for a given state. */
  function buildDog({ asleep, k, tailFrame, eyeClosed, bob }) {
    const rects = [];
    const midX = GEOM.tailW + GEOM.rearW;
    const frontX = midX + k;
    if (asleep) {
      rects.push(...spriteRects(TAIL_SLEEP, 0, 0));
      rects.push(...spriteRects(REAR_SLEEP, GEOM.tailW, 0));
      for (let j = MID_SLEEP.from; j <= MID_SLEEP.to; j++) {
        if (k > 0) rects.push({ x: midX, y: j, w: k, ch: MID_SLEEP.ch });
      }
      rects.push(...spriteRects(FRONT_SLEEP, frontX, 0));
    } else {
      rects.push(...spriteRects(tailFrame ? TAIL_DOWN : TAIL_UP, 0, 0));
      rects.push(...spriteRects(REAR, GEOM.tailW, 0));
      for (let j = MID_STAND.from; j <= MID_STAND.to; j++) {
        if (k > 0) rects.push({ x: midX, y: j, w: k, ch: MID_STAND.ch });
      }
      rects.push(...spriteRects(withEye(eyeClosed), frontX, 0));
    }
    let svg = `<g transform="translate(${GEOM.dogX} ${GEOM.dogY - (bob ? 1 : 0)})">${rectsToSVG(rects, DOG_PALETTE)}</g>`;
    if (asleep) {
      const zx = GEOM.dogX + frontX;
      const zPal = { '#': 'var(--muted)' };
      svg += `<g class="zzz">`
        + `<g class="zz z1" transform="translate(${zx + 11} 16)">${rectsToSVG(spriteRects(Z_SMALL), zPal)}</g>`
        + `<g class="zz z2" transform="translate(${zx + 16} 9)">${rectsToSVG(spriteRects(Z_MED), zPal)}</g>`
        + `<g class="zz z3" transform="translate(${zx + 22} 0)">${rectsToSVG(spriteRects(Z_BIG), zPal)}</g>`
        + `</g>`;
    }
    return svg;
  }

  return { textSVG, setText, spriteSVG, spriteRects, rectsToSVG, BONE, ICONS, GEOM, buildDog };
})();
