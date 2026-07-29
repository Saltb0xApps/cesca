'use strict';

/* ---------------- helpers ---------------- */
const $ = (s) => document.querySelector(s);
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const mins = (m) => m * 60 * 1000;
const today = () => new Date().toISOString().slice(0, 10);

function load(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}
function save(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

/* ---------------- settings & state ---------------- */
const DEFAULT_SETTINGS = {
  focus: 25, short: 5, long: 15, longEvery: 4,
  autoBreak: true, autoFocus: false, sound: true, keepAwake: true,
};
let settings = { ...DEFAULT_SETTINGS, ...(load('pawmodoro:settings') || {}) };

const PHASES = {
  focus: { label: 'Focus', dur: () => mins(settings.focus) },
  short: { label: 'Short break', dur: () => mins(settings.short) },
  long:  { label: 'Long break',  dur: () => mins(settings.long) },
};

let state = load('pawmodoro:state') || {
  phase: 'focus',
  running: false,
  endAt: null,
  remainingMs: PHASES.focus.dur(),
  bonesCycle: 0,
  bonesToday: 0,
  day: today(),
};
if (!PHASES[state.phase]) state.phase = 'focus';

function persist() { save('pawmodoro:state', state); }

function rolloverDay() {
  if (state.day !== today()) {
    state.day = today();
    state.bonesToday = 0;
  }
}

/* ---------------- elements ---------------- */
const clockEl = $('#clock');
const cycleNoteEl = $('#cycleNote');
const todayNoteEl = $('#todayNote');
const startBtn = $('#startBtn');
const dogEl = $('#dog');
const boneTarget = $('#boneTarget');
const bubbleEl = $('#bubble');
const boneRowEl = $('#boneRow');
const liveEl = $('#live');

const REDUCED = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------------- audio ---------------- */
let audioCtx = null;
function ctx() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function woof(times = 1) {
  if (!settings.sound) return;
  const ac = ctx();
  if (!ac) return;
  for (let i = 0; i < times; i++) {
    const t0 = ac.currentTime + i * 0.22;
    const osc = ac.createOscillator();
    const lp = ac.createBiquadFilter();
    const g = ac.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, t0);
    osc.frequency.exponentialRampToValueAtTime(80, t0 + 0.12);
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(700, t0);
    lp.frequency.exponentialRampToValueAtTime(220, t0 + 0.14);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.6, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.16);
    osc.connect(lp).connect(g).connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + 0.18);
  }
}

function chime() {
  if (!settings.sound) return;
  const ac = ctx();
  if (!ac) return;
  [[740, 0], [988, 0.16]].forEach(([f, dt]) => {
    const t0 = ac.currentTime + dt;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = 'square';
    osc.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.08, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.4);
    osc.connect(g).connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + 0.45);
  });
}

/* ---------------- notifications (best-effort) ---------------- */
function notify(title, body) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const opts = { body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png' };
  if (navigator.serviceWorker) {
    navigator.serviceWorker.ready
      .then((reg) => reg.showNotification(title, opts))
      .catch(() => { try { new Notification(title, opts); } catch {} });
  } else {
    try { new Notification(title, opts); } catch {}
  }
}

/* ---------------- wake lock ---------------- */
let wakeLock = null;
async function acquireWakeLock() {
  if (!settings.keepAwake || !('wakeLock' in navigator)) return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
  } catch {}
}
function releaseWakeLock() {
  if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
}
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    fastForward();
    renderAll();
    if (state.running) acquireWakeLock();
  }
});

/* ---------------- timer core ---------------- */
function remaining() {
  return state.running ? Math.max(0, state.endAt - Date.now()) : state.remainingMs;
}

function start() {
  rolloverDay();
  if (state.remainingMs <= 0) state.remainingMs = PHASES[state.phase].dur();
  state.endAt = Date.now() + state.remainingMs;
  state.running = true;
  ctx(); // unlock audio on user gesture
  acquireWakeLock();
  persist();
  renderAll();
}

function pause() {
  state.remainingMs = remaining();
  state.running = false;
  state.endAt = null;
  releaseWakeLock();
  persist();
  renderAll();
}

function reset() {
  state.running = false;
  state.endAt = null;
  state.remainingMs = PHASES[state.phase].dur();
  releaseWakeLock();
  persist();
  renderAll();
}

function setPhase(phase, { autostart = false } = {}) {
  if (phase === 'focus' && state.phase === 'long') state.bonesCycle = 0;
  state.phase = phase;
  state.running = false;
  state.endAt = null;
  state.remainingMs = PHASES[phase].dur();
  if (autostart) {
    state.running = true;
    state.endAt = Date.now() + state.remainingMs;
  }
  persist();
  renderAll();
}

function nextAfter(phase) {
  if (phase === 'focus') {
    return state.bonesCycle > 0 && state.bonesCycle % settings.longEvery === 0 ? 'long' : 'short';
  }
  return 'focus';
}

function announce(msg) { liveEl.textContent = msg; }

let excitedUntil = 0;
function excite(ms) {
  excitedUntil = Date.now() + ms;
  dogEl.classList.add('excited');
  setTimeout(() => dogEl.classList.remove('excited'), ms);
}

function handleComplete({ silent = false } = {}) {
  rolloverDay();
  const finished = state.phase;

  if (finished === 'focus') {
    state.bonesCycle += 1;
    state.bonesToday += 1;
  }
  const next = nextAfter(finished);
  const earnedLong = finished === 'focus' && next === 'long';

  if (!silent) {
    if (finished === 'focus') {
      woof(earnedLong ? 2 : 1);
      boneTarget.classList.add('gone');
      showBubble(earnedLong ? 'Woof woof!' : 'Woof!');
      excite(2200);
      if (navigator.vibrate) navigator.vibrate([120, 60, 120]);
      if (document.hidden) notify('Focus complete! 🦴', `Noodle earned a bone. Time for a ${PHASES[next].label.toLowerCase()}.`);
      announce(`Focus complete, bone earned. ${PHASES[next].label} next.`);
    } else {
      chime();
      if (navigator.vibrate) navigator.vibrate(80);
      if (document.hidden) notify('Break over!', 'Noodle is ready to stretch again.');
      announce('Break over. Focus next.');
    }
  }

  const auto = next === 'focus' ? settings.autoFocus : settings.autoBreak;
  setPhase(next, { autostart: auto });
}

/* Catch up after the tab/app was hidden or closed while the timer ran out. */
function fastForward() {
  let guard = 0;
  while (state.running && state.endAt !== null && state.endAt <= Date.now() && guard < 50) {
    const prevEnd = state.endAt;
    handleComplete({ silent: guard > 0 });
    // An auto-started next phase actually began when the previous one ended.
    if (state.running) state.endAt = prevEnd + state.remainingMs;
    guard += 1;
  }
  persist();
}

/* ---------------- rendering ---------------- */
function fmt(ms) {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function renderClock() {
  const ms = remaining();
  PIX.setText(clockEl, fmt(ms));
  const label = PHASES[state.phase].label;
  document.title = state.running ? `${fmt(ms)} · ${label} — Pawmodoro` : 'Pawmodoro — Dachshund Pomodoro';
}

/* Noodle is re-rendered only when his frame signature changes. */
let frameN = 0;
let lastDogSig = '';
function renderDogFrame(force = false) {
  const total = PHASES[state.phase].dur();
  const ms = remaining();
  const asleep = state.phase !== 'focus';
  // 0 = compact pup, kMax = fully stretched at the bone (un-stretches on breaks)
  const p = asleep ? clamp(ms / total, 0, 1) : clamp(1 - ms / total, 0, 1);
  const k = Math.round(p * PIX.GEOM.kMax);

  const excited = Date.now() < excitedUntil;
  let tailFrame = 0;
  if (!REDUCED && !asleep) {
    if (excited) tailFrame = frameN % 2;
    else if (state.running) tailFrame = Math.floor(frameN / 2) % 2;
  }
  const bob = !REDUCED && !asleep && state.running && tailFrame === 1;
  const eyeClosed = !asleep && frameN % 21 === 0 && frameN > 0;

  dogEl.classList.toggle('asleep', asleep);
  dogEl.classList.toggle('snoozing', asleep && state.running);
  dogEl.classList.toggle('running', !asleep && state.running);
  boneTarget.classList.toggle('gone', asleep);

  const sig = `${asleep}|${k}|${tailFrame}|${eyeClosed}|${bob}`;
  if (force || sig !== lastDogSig) {
    lastDogSig = sig;
    dogEl.innerHTML = PIX.buildDog({ asleep, k, tailFrame, eyeClosed, bob });
  }
}

function renderPhaseUI() {
  document.body.dataset.phase = state.phase;
  document.querySelectorAll('[data-phase-btn]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.phaseBtn === state.phase);
  });
  const slot = Math.min(state.bonesCycle + 1, settings.longEvery);
  const note = state.phase === 'focus'
    ? `Bone ${slot} of ${settings.longEvery}`
    : (state.phase === 'short' ? 'Noodle is napping...' : 'Long nap - well earned!');
  PIX.setText(cycleNoteEl, note);
  PIX.setText(todayNoteEl, `${state.bonesToday} bone${state.bonesToday === 1 ? '' : 's'} today`);
}

function renderBones() {
  const n = settings.longEvery;
  const filled = state.bonesCycle % n === 0 && state.bonesCycle > 0 ? n : state.bonesCycle % n;
  boneRowEl.innerHTML = '';
  for (let i = 0; i < n; i++) {
    const span = document.createElement('span');
    span.className = i < filled ? 'earned' : 'slot';
    span.innerHTML = PIX.spriteSVG(PIX.BONE, { '#': 'currentColor' });
    boneRowEl.appendChild(span);
  }
}

function renderButtons() {
  const label = state.running ? 'Pause' : (remaining() < PHASES[state.phase].dur() && remaining() > 0 ? 'Resume' : 'Start');
  PIX.setText(startBtn, label);
}

function renderAll() {
  renderClock();
  renderDogFrame(true);
  renderPhaseUI();
  renderBones();
  renderButtons();
}

let bubbleTimer = null;
function showBubble(text) {
  PIX.setText(bubbleEl, text);
  bubbleEl.hidden = false;
  clearTimeout(bubbleTimer);
  bubbleTimer = setTimeout(() => { bubbleEl.hidden = true; }, 2000);
}

/* ---------------- wiring ---------------- */
startBtn.addEventListener('click', () => (state.running ? pause() : start()));
$('#resetBtn').addEventListener('click', reset);
$('#skipBtn').addEventListener('click', () => {
  const next = state.phase === 'focus' ? 'short' : 'focus';
  if (state.phase === 'long') state.bonesCycle = 0;
  announce(`Skipped to ${PHASES[next].label}.`);
  setPhase(next);
});

document.querySelectorAll('[data-phase-btn]').forEach((btn) => {
  btn.addEventListener('click', () => {
    if (btn.dataset.phaseBtn !== state.phase) setPhase(btn.dataset.phaseBtn);
  });
});

/* pet the dog → happy woof */
$('#scene').addEventListener('click', (e) => {
  if (e.target.closest('button')) return;
  woof(1);
  excite(900);
});

/* ---------------- settings dialog ---------------- */
const dlg = $('#settingsDlg');
const fields = {
  focus: $('#setFocus'), short: $('#setShort'), long: $('#setLong'), longEvery: $('#setEvery'),
  autoBreak: $('#setAutoBreak'), autoFocus: $('#setAutoFocus'), sound: $('#setSound'), keepAwake: $('#setAwake'),
};

$('#settingsBtn').addEventListener('click', () => {
  fields.focus.value = settings.focus;
  fields.short.value = settings.short;
  fields.long.value = settings.long;
  fields.longEvery.value = settings.longEvery;
  fields.autoBreak.checked = settings.autoBreak;
  fields.autoFocus.checked = settings.autoFocus;
  fields.sound.checked = settings.sound;
  fields.keepAwake.checked = settings.keepAwake;
  updateNotifyBtn();
  dlg.showModal();
});

dlg.addEventListener('close', () => {
  const wasFull = !state.running && state.remainingMs === PHASES[state.phase].dur();
  const num = (el, def, lo, hi) => clamp(parseInt(el.value, 10) || def, lo, hi);
  settings.focus = num(fields.focus, DEFAULT_SETTINGS.focus, 1, 180);
  settings.short = num(fields.short, DEFAULT_SETTINGS.short, 1, 60);
  settings.long = num(fields.long, DEFAULT_SETTINGS.long, 1, 90);
  settings.longEvery = num(fields.longEvery, DEFAULT_SETTINGS.longEvery, 2, 8);
  settings.autoBreak = fields.autoBreak.checked;
  settings.autoFocus = fields.autoFocus.checked;
  settings.sound = fields.sound.checked;
  settings.keepAwake = fields.keepAwake.checked;
  save('pawmodoro:settings', settings);
  // A timer that hadn't started yet adopts the new duration immediately.
  if (wasFull) state.remainingMs = PHASES[state.phase].dur();
  persist();
  renderAll();
});

const notifyBtn = $('#notifyBtn');
function updateNotifyBtn() {
  if (!('Notification' in window)) {
    notifyBtn.textContent = 'Notifications unavailable';
    notifyBtn.disabled = true;
    return;
  }
  const p = Notification.permission;
  notifyBtn.textContent = p === 'granted' ? 'Notifications on ✓' : p === 'denied' ? 'Notifications blocked' : 'Enable notifications';
  notifyBtn.disabled = p !== 'default';
}
notifyBtn.addEventListener('click', () => {
  Notification.requestPermission().then(updateNotifyBtn);
});

/* ---------------- boot ---------------- */
function bootPixelChrome() {
  document.querySelectorAll('.pix-icon').forEach((el) => {
    el.innerHTML = PIX.spriteSVG(PIX.ICONS[el.dataset.icon], { '#': 'currentColor' });
  });
  $('.brand-bone').innerHTML = PIX.spriteSVG(PIX.BONE, { '#': 'currentColor' });
  PIX.setText($('#brandText'), 'Pawmodoro');
  PIX.setText($('#settingsTitle'), 'Settings');
  const labels = { focus: 'Focus', short: 'Short', long: 'Long' };
  document.querySelectorAll('[data-phase-btn]').forEach((btn) => {
    PIX.setText(btn, labels[btn.dataset.phaseBtn]);
  });
  boneTarget.innerHTML =
    PIX.rectsToSVG(PIX.spriteRects(PIX.BONE, PIX.GEOM.boneX + 1, PIX.GEOM.boneY + 1), { '#': 'var(--ground2)' })
    + PIX.rectsToSVG(PIX.spriteRects(PIX.BONE, PIX.GEOM.boneX, PIX.GEOM.boneY), { '#': 'var(--bone-fill)' });
}

bootPixelChrome();
rolloverDay();
fastForward();
renderAll();
setInterval(() => {
  frameN += 1;
  if (state.running) {
    if (remaining() <= 0) {
      handleComplete();
    } else {
      renderClock();
    }
  }
  renderDogFrame();
}, 200);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
