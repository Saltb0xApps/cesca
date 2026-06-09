// Super simple Pomodoro timer.
// Sessions are stored in localStorage in a shape that's easy to push to
// Notion later (one record = one completed focus session).

const STORAGE_KEY = "pomodoro.sessions.v1";

const el = {
  task: document.getElementById("task"),
  timer: document.getElementById("timer"),
  mode: document.getElementById("mode"),
  startPause: document.getElementById("startPause"),
  reset: document.getElementById("reset"),
  skip: document.getElementById("skip"),
  focusLen: document.getElementById("focusLen"),
  breakLen: document.getElementById("breakLen"),
  todayCount: document.getElementById("todayCount"),
  totalCount: document.getElementById("totalCount"),
  historyList: document.getElementById("historyList"),
  clearHistory: document.getElementById("clearHistory"),
};

let state = {
  mode: "focus", // "focus" | "break"
  remaining: 25 * 60, // seconds
  running: false,
  tickId: null,
};

// ---- persistence -----------------------------------------------------------

function loadSessions() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveSessions(sessions) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

function recordSession(durationMinutes) {
  const sessions = loadSessions();
  sessions.unshift({
    id: Date.now(),
    task: el.task.value.trim() || "Untitled",
    minutes: durationMinutes,
    completedAt: new Date().toISOString(),
    // syncedToNotion: false, // reserved for the future Notion integration
  });
  saveSessions(sessions);
  renderStats();
}

// ---- timer -----------------------------------------------------------------

function focusSeconds() {
  return Math.max(1, parseInt(el.focusLen.value, 10) || 25) * 60;
}

function breakSeconds() {
  return Math.max(1, parseInt(el.breakLen.value, 10) || 5) * 60;
}

function modeSeconds() {
  return state.mode === "focus" ? focusSeconds() : breakSeconds();
}

function format(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function render() {
  el.timer.textContent = format(state.remaining);
  el.mode.textContent = state.mode === "focus" ? "Focus" : "Break";
  el.startPause.textContent = state.running ? "Pause" : "Start";
  document.body.classList.toggle("break", state.mode === "break");
  document.title = `${format(state.remaining)} · ${
    state.mode === "focus" ? "Focus" : "Break"
  }`;
}

function tick() {
  if (state.remaining > 0) {
    state.remaining -= 1;
    render();
    return;
  }
  complete();
}

function start() {
  if (state.running) return;
  state.running = true;
  state.tickId = setInterval(tick, 1000);
  render();
}

function pause() {
  state.running = false;
  clearInterval(state.tickId);
  render();
}

function reset() {
  pause();
  state.remaining = modeSeconds();
  render();
}

function switchMode(nextMode) {
  state.mode = nextMode;
  state.remaining = modeSeconds();
  render();
}

// Called when a session counts down to zero.
function complete() {
  pause();
  if (state.mode === "focus") {
    recordSession(Math.round(focusSeconds() / 60));
    notify("Focus session done — take a break! 🍅");
    switchMode("break");
  } else {
    notify("Break over — back to it! 💪");
    switchMode("focus");
  }
}

// Skip the current phase without recording it.
function skip() {
  switchMode(state.mode === "focus" ? "break" : "focus");
}

function notify(message) {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(message);
  }
}

// ---- stats / history -------------------------------------------------------

function isToday(iso) {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function renderStats() {
  const sessions = loadSessions();
  el.totalCount.textContent = sessions.length;
  el.todayCount.textContent = sessions.filter((s) => isToday(s.completedAt)).length;

  el.historyList.innerHTML = "";
  if (sessions.length === 0) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "No sessions yet — start your first pomodoro!";
    el.historyList.appendChild(li);
    return;
  }

  for (const s of sessions.slice(0, 20)) {
    const li = document.createElement("li");

    const task = document.createElement("span");
    task.className = "h-task";
    task.textContent = `${s.task} · ${s.minutes}m`;

    const time = document.createElement("span");
    time.className = "h-time";
    time.textContent = new Date(s.completedAt).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    li.append(task, time);
    el.historyList.appendChild(li);
  }
}

// ---- events ----------------------------------------------------------------

el.startPause.addEventListener("click", () => {
  if (state.running) pause();
  else {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
    start();
  }
});

el.reset.addEventListener("click", reset);
el.skip.addEventListener("click", skip);

el.focusLen.addEventListener("change", () => {
  if (!state.running && state.mode === "focus") reset();
});
el.breakLen.addEventListener("change", () => {
  if (!state.running && state.mode === "break") reset();
});

el.clearHistory.addEventListener("click", () => {
  if (confirm("Clear all pomodoro history?")) {
    saveSessions([]);
    renderStats();
  }
});

// ---- init ------------------------------------------------------------------

state.remaining = focusSeconds();
render();
renderStats();
