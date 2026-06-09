/* THE MODERN RENAISSANCE — antique planisphere of members
   A Cantino-style portolan world chart: vellum, rhumb-line network,
   compass roses, loosely-drawn green coastlines, red tropics, blackletter
   ocean names — with member cities marked as interactive ports. */
(function () {
  "use strict";

  // [name, lat, lon, members, sampleName]
  var CITIES = [
    ["Lisbon", 38.72, -9.14, 34, "Mira Vance"],
    ["London", 51.51, -0.13, 58, ""],
    ["Berlin", 52.52, 13.40, 47, "Elias Thorne"],
    ["Paris", 48.86, 2.35, 39, ""],
    ["Reykjavík", 64.15, -21.94, 9, "Julian Brandt"],
    ["New York", 40.71, -74.0, 71, ""],
    ["Toronto", 43.65, -79.38, 22, ""],
    ["Mexico City", 19.43, -99.13, 28, "Imani Reyes"],
    ["São Paulo", -23.55, -46.63, 26, ""],
    ["Bogotá", 4.71, -74.07, 14, ""],
    ["Accra", 5.60, -0.19, 17, "Ode Mensah"],
    ["Lagos", 6.52, 3.37, 23, "Naomi Okafor"],
    ["Nairobi", -1.29, 36.82, 12, ""],
    ["Cairo", 30.04, 31.24, 16, ""],
    ["Athens", 37.98, 23.73, 13, "Costa Vrettos"],
    ["Tbilisi", 41.72, 44.78, 8, "Sasha Petrov"],
    ["Mumbai", 19.07, 72.87, 31, ""],
    ["Taipei", 25.03, 121.56, 19, "Lin Hsu"],
    ["Tokyo", 35.68, 139.69, 33, ""],
    ["Singapore", 1.35, 103.82, 21, ""],
    ["Sydney", -33.87, 151.21, 24, ""]
  ];

  // antique ocean / region legends — placed at [lon, lat]
  var OCEANS = [
    ["Oceanus Occidentalis", -42, 38, 30],
    ["Mare Atlanticum", -28, 2, 24],
    ["Oceanus Pacificus", -132, 10, 30],
    ["Mare Pacificum", 138, -8, 24],
    ["Oceanus Orientalis", 145, 32, 18],
    ["Mare Indicum", 76, -22, 28],
    ["Oceanus Meridionalis", 70, -58, 25],
    ["Mare Glaciale", 52, 80, 24]
  ];
  var REGIONS = [
    ["EVROPA", 16, 52],
    ["AFRICA", 19, 6],
    ["ASIA", 92, 50],
    ["AMERICA", -96, 42],
    ["BRASIL", -52, -12],
    ["TERRA AVSTRALIS", 132, -78]
  ];

  var wrap = document.getElementById("portolan");
  var canvas = document.getElementById("portolanCanvas");
  var tip = document.getElementById("portolanTip");
  if (!wrap || !canvas) return;
  var ctx = canvas.getContext("2d");

  // geographic window of the chart — standard 2:1 world-map proportions
  var LON0 = -180, LON1 = 180, LATT = 90, LATB = -90;
  var maxMembers = CITIES.reduce(function (m, c) { return Math.max(m, c[3]); }, 1);

  var W = 0, H = 0, dpr = 1;
  var base = document.createElement("canvas");
  var bctx = base.getContext("2d");
  var pinScreens = [];
  var mouse = { x: -999, y: -999, inside: false };
  var hoverIdx = -1;
  var P = {};
  var fontReady = false;

  // ---- seeded RNG (stable speckles / hand-drawn wobble) ----
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hexLum(hex) {
    hex = hex.replace("#", "");
    if (hex.length === 3) hex = hex.replace(/./g, "$&$&");
    var r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  }

  function palette() {
    var cs = getComputedStyle(document.documentElement);
    var paper = cs.getPropertyValue("--paper").trim() || "#f1eee4";
    var deep = cs.getPropertyValue("--paper-deep").trim() || "#e8e3d6";
    var ink = cs.getPropertyValue("--ink").trim() || "#1b1d1c";
    var accent = cs.getPropertyValue("--accent").trim() || "#00706e";
    var dark = hexLum(paper) < 0.4;
    return {
      dark: dark,
      paper: paper,
      deep: deep,
      ink: ink,
      accent: accent,
      vellum: dark ? "#16201d" : "#e9dec3",
      vellum2: dark ? "#101917" : "#e3d6b6",
      sepia: dark ? "rgba(196,182,150," : "rgba(74,60,38,",   // open alpha
      line: dark ? "rgba(176,164,134," : "rgba(60,48,30,",
      red: dark ? "#cf6a59" : "#9d3a2c",
      green: accent,
      gold: dark ? "#cab064" : "#9c7a32",
      stain: dark ? "rgba(8,14,12," : "rgba(120,96,54,",
      textInk: ink
    };
  }

  function resize() {
    var rect = wrap.getBoundingClientRect();
    W = rect.width; H = rect.height;
    if (W < 2 || H < 2) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = base.width = Math.round(W * dpr);
    canvas.height = base.height = Math.round(H * dpr);
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    P = palette();
    renderBase();
    frame();
  }

  // equirectangular projection within the chart window
  function px(lon, lat) {
    return {
      x: (lon - LON0) / (LON1 - LON0) * W,
      y: (LATT - lat) / (LATT - LATB) * H
    };
  }

  // ---------- BASE CHART (drawn once per resize / theme) ----------
  function renderBase() {
    var g = bctx;
    g.clearRect(0, 0, W, H);

    // 1 — vellum ground
    var grd = g.createLinearGradient(0, 0, W, H);
    grd.addColorStop(0, P.vellum);
    grd.addColorStop(1, P.vellum2);
    g.fillStyle = grd;
    g.fillRect(0, 0, W, H);

    // age speckle + blotches
    var rnd = mulberry32(20260609);
    for (var s = 0; s < 46; s++) {
      var bx = rnd() * W, by = rnd() * H, br = (18 + rnd() * 120);
      var rg = g.createRadialGradient(bx, by, 0, bx, by, br);
      rg.addColorStop(0, P.stain + (0.018 + rnd() * 0.05) + ")");
      rg.addColorStop(1, P.stain + "0)");
      g.fillStyle = rg;
      g.beginPath(); g.arc(bx, by, br, 0, 6.2832); g.fill();
    }
    // fine fly-speck spots
    for (var d = 0; d < 240; d++) {
      g.fillStyle = P.stain + (0.05 + rnd() * 0.12) + ")";
      var dr = 0.4 + rnd() * 1.1;
      g.beginPath(); g.arc(rnd() * W, rnd() * H, dr, 0, 6.2832); g.fill();
    }

    // 2 — rhumb-line network (wind rose lattice)
    drawRhumbs(g);

    // 3 — tropics, equator, polar circles (faded red rules)
    drawParallels(g);

    // 4 — coastlines (loosely drawn) with green coastal wash
    drawLand(g);

    // 5 — decorative compass roses
    var cx = W * 0.5, cy = H * 0.5;
    drawRose(g, px(52, 4).x, px(52, 4).y, Math.min(W, H) * 0.13, true);   // ornate, Indian Ocean
    drawRose(g, px(-120, 18).x, px(-120, 18).y, Math.min(W, H) * 0.072, false);
    drawRose(g, px(-30, -34).x, px(-30, -34).y, Math.min(W, H) * 0.066, false);
    drawRose(g, px(150, 40).x, px(150, 40).y, Math.min(W, H) * 0.06, false);
    drawRose(g, px(-58, 52).x, px(-58, 52).y, Math.min(W, H) * 0.05, false);
    drawRose(g, px(108, -20).x, px(108, -20).y, Math.min(W, H) * 0.055, false);

    // 6 — scale bars
    drawScaleBar(g, px(-150, -38), W * 0.11);
    drawScaleBar(g, px(150, -40), W * 0.1);

    // 7 — antique lettering
    drawLabels(g);

    // 8 — panel seams + vignette (the framed-panels look)
    drawSeams(g);
    drawVignette(g);
  }

  function drawRhumbs(g) {
    var cx = W * 0.5, cy = H * 0.5;
    var rx = W * 0.47, ry = H * 0.47;
    var nodes = [[cx, cy]];
    var N = 16;
    for (var i = 0; i < N; i++) {
      var a = (i / N) * 6.2832;
      nodes.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
    }
    var reach = Math.hypot(W, H);
    for (var n = 0; n < nodes.length; n++) {
      var node = nodes[n];
      for (var k = 0; k < 16; k++) {
        var ang = (k / 16) * 6.2832;
        var col, alpha, lw;
        if (k % 4 === 0) { col = P.red; alpha = 0.18; lw = 0.7; }      // principal winds
        else if (k % 2 === 0) { col = P.green; alpha = 0.15; lw = 0.6; } // half winds
        else { col = null; alpha = 0.12; lw = 0.5; }                    // quarter winds
        g.beginPath();
        g.moveTo(node[0], node[1]);
        g.lineTo(node[0] + Math.cos(ang) * reach, node[1] + Math.sin(ang) * reach);
        g.lineWidth = lw;
        g.strokeStyle = col ? hexA(col, alpha) : (P.line + alpha + ")");
        g.stroke();
      }
    }
    // the binding circle the nodes sit on
    g.beginPath();
    g.ellipse(cx, cy, rx, ry, 0, 0, 6.2832);
    g.lineWidth = 0.7;
    g.strokeStyle = P.line + "0.22)";
    g.stroke();
  }

  function drawParallels(g) {
    var rows = [
      [66.5, "Circulus Articus"],
      [23.5, "Tropicus Cancri"],
      [0, "Linea Equinoctialis"],
      [-23.5, "Tropicus Capricorni"],
      [-66.5, "Circulus Antarcticus"]
    ];
    g.save();
    for (var i = 0; i < rows.length; i++) {
      var lat = rows[i][0];
      var y = px(0, lat).y;
      if (y < 2 || y > H - 2) continue;
      g.beginPath();
      g.setLineDash(lat === 0 ? [] : [1.5, 5]);
      g.moveTo(0, y); g.lineTo(W, y);
      g.lineWidth = lat === 0 ? 1.1 : 0.8;
      g.strokeStyle = hexA(P.red, lat === 0 ? 0.5 : 0.38);
      g.stroke();
    }
    g.restore();
  }

  // hand-drawn coastline with seeded wobble + green coastal wash
  function pathLand(g, jitter) {
    var rnd = mulberry32(7777);
    var L = window.WORLD_LAND || [];
    g.beginPath();
    for (var r = 0; r < L.length; r++) {
      var ring = L[r];
      if (ring.length < 3) continue;
      var first = true;
      for (var p = 0; p < ring.length; p++) {
        var lon = ring[p][0], lat = ring[p][1];
        if (jitter) { lon += (rnd() - 0.5) * 0.55; lat += (rnd() - 0.5) * 0.55; }
        if (lat > LATT + 4 || lat < LATB - 6) { /* still project, clipped by canvas */ }
        var pt = px(lon, lat);
        if (first) { g.moveTo(pt.x, pt.y); first = false; }
        else g.lineTo(pt.x, pt.y);
      }
      g.closePath();
    }
  }

  function drawLand(g) {
    // faint warm land fill
    pathLand(g, true);
    g.fillStyle = P.dark ? "rgba(40,54,48,0.45)" : "rgba(228,214,176,0.55)";
    g.fill("evenodd");

    // green coastal band — clip to land, stroke thick inside the edge
    g.save();
    pathLand(g, true);
    g.clip("evenodd");
    pathLand(g, true);
    g.lineWidth = 7;
    g.strokeStyle = hexA(P.green, P.dark ? 0.42 : 0.5);
    g.lineJoin = "round";
    g.stroke();
    g.lineWidth = 14;
    g.strokeStyle = hexA(P.green, 0.16);
    g.stroke();
    g.restore();

    // ink coastline on top
    pathLand(g, true);
    g.lineWidth = 0.9;
    g.lineJoin = "round";
    g.strokeStyle = P.dark ? "rgba(210,225,218,0.55)" : "rgba(58,46,30,0.7)";
    g.stroke();
  }

  // 32-point compass rose
  function drawRose(g, x, y, R, ornate) {
    g.save();
    g.translate(x, y);
    var pts = ornate ? 16 : 8;
    var rIn = R * 0.16;
    // faint binding circles
    g.strokeStyle = P.line + "0.3)";
    g.lineWidth = 0.7;
    [R, R * 0.5].forEach(function (rr) {
      g.beginPath(); g.arc(0, 0, rr, 0, 6.2832); g.stroke();
    });
    for (var i = 0; i < pts; i++) {
      var a0 = (i / pts) * 6.2832 - Math.PI / 2;
      var a1 = ((i + 0.5) / pts) * 6.2832 - Math.PI / 2;
      var len = (i % 2 === 0) ? R : R * (ornate ? 0.62 : 0.7);
      var tipx = Math.cos(a0) * len, tipy = Math.sin(a0) * len;
      var bx = Math.cos(a1) * rIn, by = Math.sin(a1) * rIn;
      var b2x = Math.cos(a1 - (1 / pts) * 6.2832) * rIn, b2y = Math.sin(a1 - (1 / pts) * 6.2832) * rIn;
      // each point as two shaded facets (alternating ink / red-ish)
      var darkFacet = (i % 2 === 0);
      g.beginPath();
      g.moveTo(tipx, tipy); g.lineTo(bx, by); g.lineTo(0, 0); g.closePath();
      g.fillStyle = darkFacet ? hexA(P.textInk, 0.72) : hexA(P.red, 0.5);
      g.fill();
      g.beginPath();
      g.moveTo(tipx, tipy); g.lineTo(b2x, b2y); g.lineTo(0, 0); g.closePath();
      g.fillStyle = darkFacet ? hexA(P.textInk, 0.32) : hexA(P.gold, 0.55);
      g.fill();
    }
    // hub
    g.beginPath(); g.arc(0, 0, rIn * 0.8, 0, 6.2832);
    g.fillStyle = hexA(P.gold, 0.85); g.fill();
    g.beginPath(); g.arc(0, 0, rIn * 0.42, 0, 6.2832);
    g.fillStyle = hexA(P.red, 0.9); g.fill();
    if (ornate) {
      // fleur tip to the north
      g.fillStyle = hexA(P.red, 0.8);
      g.beginPath();
      g.moveTo(0, -R * 1.12); g.lineTo(-R * 0.07, -R * 0.92); g.lineTo(R * 0.07, -R * 0.92);
      g.closePath(); g.fill();
    }
    g.restore();
  }

  function drawScaleBar(g, at, w) {
    var segs = 8, sw = w / segs, h = 5;
    g.save();
    g.translate(at.x - w / 2, at.y);
    for (var i = 0; i < segs; i++) {
      g.fillStyle = (i % 2 === 0) ? hexA(P.textInk, 0.7) : hexA(P.red, 0.6);
      g.fillRect(i * sw, 0, sw, h);
    }
    g.strokeStyle = hexA(P.textInk, 0.6); g.lineWidth = 0.6;
    g.strokeRect(0, 0, w, h);
    g.restore();
  }

  function drawLabels(g) {
    if (!fontReady) return;
    // ocean names — blackletter, faded
    for (var i = 0; i < OCEANS.length; i++) {
      var o = OCEANS[i], pt = px(o[1], o[2]);
      g.save();
      g.font = '400 ' + o[3] + 'px "UnifrakturMaguntia", "Cormorant Garamond", serif';
      g.textAlign = "center"; g.textBaseline = "middle";
      g.fillStyle = hexA(P.textInk, P.dark ? 0.5 : 0.46);
      g.fillText(o[0], pt.x, pt.y);
      g.restore();
    }
    // region names — small caps chancery, oxblood
    for (var r = 0; r < REGIONS.length; r++) {
      var rg = REGIONS[r], rp = px(REGIONS[r][1], REGIONS[r][2]);
      g.save();
      g.font = 'italic 600 15px "Cormorant Garamond", serif';
      g.textAlign = "center"; g.textBaseline = "middle";
      g.fillStyle = hexA(P.red, 0.62);
      g.shadowColor = "rgba(0,0,0,0)";
      var t = rg[0].split("").join("\u200a");
      g.fillText(t, rp.x, rp.y);
      g.restore();
    }
  }

  function drawSeams(g) {
    g.save();
    g.strokeStyle = P.stain + "0.12)";
    g.lineWidth = 1;
    [W / 3, (2 * W) / 3].forEach(function (x) {
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke();
    });
    g.beginPath(); g.moveTo(0, H / 2); g.lineTo(W, H / 2); g.stroke();
    g.restore();
  }

  function drawVignette(g) {
    var vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.62);
    vg.addColorStop(0, P.stain + "0)");
    vg.addColorStop(1, P.stain + (P.dark ? "0.5)" : "0.22)"));
    g.fillStyle = vg;
    g.fillRect(0, 0, W, H);
  }

  // ---------- INTERACTIVE LAYER (pins + tooltip) ----------
  function frame() {
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(base, 0, 0, W, H);

    pinScreens = [];
    hoverIdx = -1;
    var best = 15;
    for (var i = 0; i < CITIES.length; i++) {
      var c = CITIES[i];
      var p = px(c[2], c[1]);
      pinScreens.push(p);
      if (mouse.inside) {
        var dd = Math.hypot(p.x - mouse.x, p.y - mouse.y);
        if (dd < best) { best = dd; hoverIdx = i; }
      }
    }

    for (var f = 0; f < pinScreens.length; f++) {
      var ps = pinScreens[f];
      var members = CITIES[f][3];
      var size = 2.2 + (members / maxMembers) * 3.4;
      var hov = f === hoverIdx;
      if (hov) {
        ctx.beginPath(); ctx.arc(ps.x, ps.y, size + 6, 0, 6.2832);
        ctx.fillStyle = hexA(P.gold, 0.3); ctx.fill();
      }
      // little port marker: dot + hairline ring
      ctx.beginPath(); ctx.arc(ps.x, ps.y, hov ? size + 1.2 : size, 0, 6.2832);
      ctx.fillStyle = hexA(P.red, 0.95); ctx.fill();
      ctx.lineWidth = 1.1; ctx.strokeStyle = hexA(P.gold, 0.9); ctx.stroke();
    }

    if (hoverIdx >= 0) {
      var c2 = CITIES[hoverIdx], sp = pinScreens[hoverIdx];
      var who = c2[4] ? '<span class="gtip__who">incl. ' + c2[4] + '</span>' : '';
      tip.innerHTML = '<span class="gtip__city">' + c2[0] + '</span><span class="gtip__n">' + c2[3] + ' members</span>' + who;
      tip.style.left = sp.x + "px";
      tip.style.top = (sp.y - 12) + "px";
      tip.classList.add("show");
      canvas.style.cursor = "pointer";
    } else {
      tip.classList.remove("show");
      canvas.style.cursor = "default";
    }
  }

  function hexA(hex, a) {
    if (hex[0] !== "#") return hex; // already rgba-ish (shouldn't happen)
    var h = hex.replace("#", "");
    if (h.length === 3) h = h.replace(/./g, "$&$&");
    var r = parseInt(h.slice(0, 2), 16), gg = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    return "rgba(" + r + "," + gg + "," + b + "," + a + ")";
  }

  // ---------- events ----------
  function pos(e) {
    var rct = canvas.getBoundingClientRect();
    var t = e.touches ? e.touches[0] : e;
    return { x: t.clientX - rct.left, y: t.clientY - rct.top };
  }
  canvas.addEventListener("pointermove", function (e) {
    var p = pos(e); mouse.x = p.x; mouse.y = p.y; mouse.inside = true; frame();
  });
  canvas.addEventListener("pointerleave", function () { mouse.inside = false; frame(); });

  window.addEventListener("resize", resize, { passive: true });
  new MutationObserver(function () { P = palette(); renderBase(); frame(); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  // counts
  var cityEl = document.getElementById("atlasCities");
  var memEl = document.getElementById("atlasMembers");
  var total = CITIES.reduce(function (s, c) { return s + c[3]; }, 0);
  if (cityEl) cityEl.textContent = CITIES.length;
  if (memEl) memEl.textContent = total.toLocaleString();

  // first paint (then upgrade once the blackletter font lands)
  resize();
  if (document.fonts && document.fonts.load) {
    Promise.all([
      document.fonts.load('30px "UnifrakturMaguntia"'),
      document.fonts.load('italic 600 15px "Cormorant Garamond"')
    ]).then(function () { fontReady = true; renderBase(); frame(); })
      .catch(function () { fontReady = true; renderBase(); frame(); });
  } else {
    fontReady = true;
  }
})();
