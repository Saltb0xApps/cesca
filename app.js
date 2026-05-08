/* cesca — personal brand companion for multi-passionate people */

(() => {
  const STORAGE_KEY = "cesca:v1";
  const DAY_MS = 24 * 60 * 60 * 1000;

  /* ---------- state ---------- */
  const defaultState = () => ({
    started: false,
    completedAt: null,
    flowIndex: 0,
    answers: {},      // { questionId: { value, unknown: false, updatedAt } }
    checkins: [],     // [{ at, answers: { id: value } }]
    nextCheckinAt: null,
    notifications: false,
    lastSeenAt: null,
  });

  const load = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      return Object.assign(defaultState(), JSON.parse(raw));
    } catch { return defaultState(); }
  };
  const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

  let state = load();
  state.lastSeenAt = Date.now();

  /* ---------- view router ---------- */
  const views = document.querySelectorAll(".view");
  const nav = document.getElementById("nav");

  function show(viewName) {
    views.forEach(v => v.classList.toggle("active", v.dataset.view === viewName));
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function go(target) {
    if (target === "flow-resume") {
      state.flowIndex = 0;
      save();
      renderQuestion();
      show("flow");
      return;
    }
    if (target === "home") { renderHome(); show("home"); return; }
    if (target === "map")  { renderMap();  show("map");  return; }
    if (target === "checkins") { renderCheckins(); show("checkins"); return; }
    if (target === "unknowns") { renderUnknowns(); show("unknowns"); return; }
    if (target === "flow") { renderQuestion(); show("flow"); return; }
    if (target === "welcome") { show("welcome"); return; }
  }

  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-go]");
    if (t) { e.preventDefault(); go(t.dataset.go); }
  });

  document.getElementById("start-btn").addEventListener("click", () => {
    state.started = true;
    state.flowIndex = 0;
    save();
    nav.hidden = false;
    go("flow");
  });

  document.getElementById("reset-btn").addEventListener("click", () => {
    if (!confirm("Erase everything you've written and start over? This can't be undone.")) return;
    localStorage.removeItem(STORAGE_KEY);
    state = defaultState();
    nav.hidden = true;
    go("welcome");
  });

  /* ---------- question flow ---------- */
  const card = document.getElementById("question-card");
  const titleEl = document.getElementById("question-title");
  const helpEl = document.getElementById("question-help");
  const phaseTagEl = document.getElementById("phase-tag");
  const answerArea = document.getElementById("answer-area");
  const backBtn = document.getElementById("back-btn");
  const nextBtn = document.getElementById("next-btn");
  const dontKnowBtn = document.getElementById("dont-know-btn");
  const progressFill = document.getElementById("progress-fill");
  const progressSection = document.getElementById("progress-section");
  const progressCount = document.getElementById("progress-count");

  function currentQuestion() {
    return QUESTIONS[Math.max(0, Math.min(state.flowIndex, QUESTIONS.length - 1))];
  }

  function getAnswer(id) { return state.answers[id] || null; }
  function setAnswer(id, patch) {
    const prev = state.answers[id] || {};
    state.answers[id] = Object.assign({ value: null, unknown: false }, prev, patch, { updatedAt: Date.now() });
    save();
  }

  function renderQuestion() {
    if (state.flowIndex >= QUESTIONS.length) {
      finishFlow();
      return;
    }
    const q = currentQuestion();
    const a = getAnswer(q.id) || {};

    phaseTagEl.textContent = q.phase;
    titleEl.textContent = q.title;
    helpEl.textContent = q.help || "";

    progressSection.textContent = q.phase;
    progressCount.textContent = `Question ${state.flowIndex + 1} of ${QUESTIONS.length}`;
    progressFill.style.width = `${((state.flowIndex) / QUESTIONS.length) * 100}%`;

    backBtn.disabled = state.flowIndex === 0;
    nextBtn.textContent = state.flowIndex === QUESTIONS.length - 1 ? "Build my brand map" : "Continue";

    answerArea.innerHTML = "";
    renderAnswerInput(q, a);
  }

  function renderAnswerInput(q, a) {
    const value = a.value;
    if (q.type === "long") {
      const ta = document.createElement("textarea");
      ta.placeholder = q.placeholder || "";
      ta.value = (value && !Array.isArray(value)) ? value : "";
      ta.id = "answer-input";
      answerArea.appendChild(ta);
      ta.focus();
    } else if (q.type === "short") {
      const inp = document.createElement("input");
      inp.type = "text";
      inp.placeholder = q.placeholder || "";
      inp.value = (value && !Array.isArray(value)) ? value : "";
      inp.id = "answer-input";
      answerArea.appendChild(inp);
      inp.focus();
    } else if (q.type === "list") {
      const wrap = document.createElement("div");
      wrap.className = "list-input";
      wrap.id = "answer-input";

      const items = Array.isArray(value) && value.length ? value.slice() : [""];
      const render = () => {
        wrap.innerHTML = "";
        items.forEach((it, i) => {
          const row = document.createElement("div");
          row.className = "list-row";
          const inp = document.createElement("input");
          inp.type = "text";
          inp.placeholder = q.placeholder || "";
          inp.value = it;
          inp.addEventListener("input", () => { items[i] = inp.value; });
          const del = document.createElement("button");
          del.type = "button";
          del.textContent = "–";
          del.title = "Remove";
          del.addEventListener("click", () => {
            items.splice(i, 1);
            if (items.length === 0) items.push("");
            render();
          });
          row.appendChild(inp);
          row.appendChild(del);
          wrap.appendChild(row);
        });
        const add = document.createElement("button");
        add.type = "button";
        add.className = "add-row";
        add.textContent = "+ add another";
        add.addEventListener("click", () => { items.push(""); render(); });
        wrap.appendChild(add);
      };
      render();
      wrap._getValue = () => items.map(s => s.trim()).filter(Boolean);
      answerArea.appendChild(wrap);
    } else if (q.type === "single" || q.type === "multi") {
      const wrap = document.createElement("div");
      wrap.className = "choice-grid";
      wrap.id = "answer-input";
      const selected = new Set(Array.isArray(value) ? value : (value ? [value] : []));
      q.options.forEach(opt => {
        const lbl = document.createElement("label");
        lbl.className = "choice" + (selected.has(opt.value) ? " selected" : "");
        const inp = document.createElement("input");
        inp.type = q.type === "multi" ? "checkbox" : "radio";
        inp.name = q.id;
        inp.value = opt.value;
        inp.checked = selected.has(opt.value);
        inp.addEventListener("change", () => {
          if (q.type === "single") {
            selected.clear();
            wrap.querySelectorAll(".choice").forEach(c => c.classList.remove("selected"));
          }
          if (inp.checked) { selected.add(opt.value); lbl.classList.add("selected"); }
          else             { selected.delete(opt.value); lbl.classList.remove("selected"); }
        });
        const text = document.createElement("span");
        text.innerHTML = `<span class="label">${opt.label}</span>` + (opt.hint ? `<span class="hint">${opt.hint}</span>` : "");
        lbl.appendChild(inp);
        lbl.appendChild(text);
        wrap.appendChild(lbl);
      });
      wrap._getValue = () => Array.from(selected);
      answerArea.appendChild(wrap);
    }
  }

  function readCurrentInput() {
    const q = currentQuestion();
    const node = document.getElementById("answer-input");
    if (!node) return null;
    if (q.type === "long" || q.type === "short") {
      const v = node.value.trim();
      return v.length ? v : null;
    }
    if (q.type === "list" || q.type === "multi" || q.type === "single") {
      const v = node._getValue();
      return v && v.length ? v : null;
    }
    return null;
  }

  nextBtn.addEventListener("click", () => {
    const q = currentQuestion();
    const v = readCurrentInput();
    if (v === null) {
      // Treat empty as unknown — soft nudge instead of blocking
      if (!confirm("Leave this blank and come back later? It'll be added to your open loops.")) return;
      setAnswer(q.id, { value: null, unknown: true });
    } else {
      setAnswer(q.id, { value: v, unknown: false });
    }
    state.flowIndex++;
    save();
    if (state.flowIndex >= QUESTIONS.length) finishFlow();
    else renderQuestion();
  });

  backBtn.addEventListener("click", () => {
    if (state.flowIndex > 0) {
      state.flowIndex--;
      save();
      renderQuestion();
    }
  });

  dontKnowBtn.addEventListener("click", () => {
    const q = currentQuestion();
    setAnswer(q.id, { value: null, unknown: true });
    state.flowIndex++;
    save();
    if (state.flowIndex >= QUESTIONS.length) finishFlow();
    else renderQuestion();
  });

  function finishFlow() {
    if (!state.completedAt) state.completedAt = Date.now();
    if (!state.nextCheckinAt) state.nextCheckinAt = Date.now() + CHECKIN_INTERVAL_DAYS * DAY_MS;
    save();
    progressFill.style.width = "100%";
    go("home");
  }

  /* ---------- home / dashboard ---------- */
  const greeting = document.getElementById("greeting");
  const dashSentence = document.getElementById("dash-sentence");
  const dashPillars = document.getElementById("dash-pillars");
  const dashUnknownsCount = document.getElementById("dash-unknowns-count");
  const dashNextCheckin = document.getElementById("dash-next-checkin");
  const checkinBanner = document.getElementById("checkin-banner");
  const checkinBannerText = document.getElementById("checkin-banner-text");
  const startCheckinBtn = document.getElementById("start-checkin-btn");
  const notifToggle = document.getElementById("notif-toggle");

  function renderHome() {
    greeting.textContent = greetingText();

    const thread = answerText("thread");
    dashSentence.textContent = thread || "(your one-line brand sentence will live here once you write it)";

    dashPillars.innerHTML = "";
    const pillars = answerList("pillars");
    if (pillars.length) {
      pillars.forEach(p => {
        const li = document.createElement("li"); li.textContent = p;
        dashPillars.appendChild(li);
      });
    } else {
      const li = document.createElement("li"); li.className = "empty"; li.textContent = "Not set yet";
      dashPillars.appendChild(li);
    }

    dashUnknownsCount.textContent = String(unknownIds().length);

    dashNextCheckin.textContent = nextCheckinText();

    notifToggle.checked = !!state.notifications;

    const due = isCheckinDue();
    checkinBanner.hidden = !due;
    if (due) {
      const days = Math.max(1, Math.round((Date.now() - (state.completedAt || Date.now())) / DAY_MS));
      checkinBannerText.textContent = `It's been about ${days} day${days === 1 ? "" : "s"} since we last talked. A short check-in keeps the thread alive.`;
    }
  }

  startCheckinBtn.addEventListener("click", () => go("checkins"));

  notifToggle.addEventListener("change", async () => {
    if (notifToggle.checked) {
      if (!("Notification" in window)) {
        alert("Your browser doesn't support notifications.");
        notifToggle.checked = false;
        return;
      }
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        notifToggle.checked = false;
        state.notifications = false;
        save();
        return;
      }
      state.notifications = true;
      save();
      new Notification("Cesca will check in on you.", {
        body: "We'll only ping you when it's time to reflect — every week or so.",
        silent: true
      });
    } else {
      state.notifications = false;
      save();
    }
  });

  function greetingText() {
    const h = new Date().getHours();
    if (h < 5) return "Late night thoughts";
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  }

  function nextCheckinText() {
    if (!state.nextCheckinAt) return "We'll start scheduling these once you finish the discovery flow.";
    const diff = state.nextCheckinAt - Date.now();
    if (diff <= 0) return "Now — it's time.";
    const days = Math.ceil(diff / DAY_MS);
    return days === 1 ? "Tomorrow." : `In ${days} days.`;
  }

  function isCheckinDue() {
    return state.completedAt && state.nextCheckinAt && Date.now() >= state.nextCheckinAt;
  }

  /* ---------- helpers for answers ---------- */
  function answerText(id) {
    const a = state.answers[id];
    if (!a || a.unknown) return "";
    if (Array.isArray(a.value)) return a.value.join(", ");
    return a.value || "";
  }
  function answerList(id) {
    const a = state.answers[id];
    if (!a || a.unknown || !Array.isArray(a.value)) return [];
    return a.value;
  }
  function unknownIds() {
    return Object.entries(state.answers)
      .filter(([_, a]) => a.unknown || (a.value === null || a.value === undefined ||
                                        (Array.isArray(a.value) && a.value.length === 0) ||
                                        a.value === ""))
      .map(([id]) => id);
  }

  /* ---------- brand map ---------- */
  const mapContent = document.getElementById("map-content");
  const exportBtn = document.getElementById("export-btn");

  function renderMap() {
    mapContent.innerHTML = "";
    QUESTIONS.forEach(q => {
      const a = state.answers[q.id];
      const block = document.createElement("article");
      block.className = "map-block";
      const h = document.createElement("h3");
      h.textContent = q.mapLabel || q.title;
      block.appendChild(h);

      const ans = document.createElement("div");
      if (!a || a.unknown || a.value === null || a.value === "" ||
          (Array.isArray(a.value) && a.value.length === 0)) {
        ans.className = "map-answer empty";
        ans.textContent = a && a.unknown ? "(parked — open loop)" : "(not answered yet)";
      } else if (Array.isArray(a.value)) {
        if (q.type === "multi") {
          // map values back to labels
          const labels = a.value.map(v => {
            const opt = (q.options || []).find(o => o.value === v);
            return opt ? opt.label : v;
          });
          ans.className = "map-answer";
          ans.textContent = labels.join(" · ");
        } else {
          const ul = document.createElement("ul");
          a.value.forEach(item => {
            const li = document.createElement("li"); li.textContent = item; ul.appendChild(li);
          });
          ans.appendChild(ul);
        }
      } else {
        ans.className = "map-answer";
        ans.textContent = a.value;
      }
      block.appendChild(ans);
      mapContent.appendChild(block);
    });
  }

  exportBtn.addEventListener("click", () => {
    const lines = [];
    lines.push("MY BRAND MAP");
    lines.push("=".repeat(40));
    lines.push("");
    QUESTIONS.forEach(q => {
      lines.push(`# ${q.mapLabel || q.title}`);
      const a = state.answers[q.id];
      if (!a || a.unknown || a.value === null || a.value === "" ||
          (Array.isArray(a.value) && a.value.length === 0)) {
        lines.push(a && a.unknown ? "(parked — open loop)" : "(not answered yet)");
      } else if (Array.isArray(a.value)) {
        if (q.type === "multi") {
          lines.push(a.value.map(v => {
            const opt = (q.options || []).find(o => o.value === v);
            return opt ? opt.label : v;
          }).join(", "));
        } else {
          a.value.forEach(item => lines.push(`- ${item}`));
        }
      } else {
        lines.push(a.value);
      }
      lines.push("");
    });
    const text = lines.join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "my-brand-map.txt";
    link.click();
    URL.revokeObjectURL(url);
  });

  /* ---------- check-ins ---------- */
  const checkinArea = document.getElementById("checkin-area");
  const checkinHistory = document.getElementById("checkin-history");

  function renderCheckins() {
    checkinArea.innerHTML = "";

    const card = document.createElement("div");
    card.className = "question-card";
    const tag = document.createElement("p");
    tag.className = "phase-tag";
    tag.textContent = isCheckinDue() ? "It's time" : "A check-in, whenever you want one";
    card.appendChild(tag);

    const h = document.createElement("h2");
    h.textContent = "Five short questions.";
    card.appendChild(h);

    const help = document.createElement("p");
    help.className = "question-help";
    help.textContent = "Be short. Be honest. We're collecting truth, not polish.";
    card.appendChild(help);

    const inputs = {};
    CHECKIN_QUESTIONS.forEach(cq => {
      const lbl = document.createElement("label");
      lbl.style.display = "block";
      lbl.style.margin = "18px 0 6px";
      lbl.style.fontWeight = "500";
      lbl.textContent = cq.title;
      card.appendChild(lbl);

      const node = cq.type === "long"
        ? document.createElement("textarea")
        : document.createElement("input");
      if (cq.type !== "long") node.type = "text";
      node.placeholder = cq.placeholder || "";
      card.appendChild(node);
      inputs[cq.id] = node;
    });

    const controls = document.createElement("div");
    controls.className = "flow-controls";
    const skip = document.createElement("button");
    skip.className = "btn ghost";
    skip.textContent = "Not today";
    skip.addEventListener("click", () => {
      // Push next check-in by 2 days
      state.nextCheckinAt = Date.now() + 2 * DAY_MS;
      save();
      go("home");
    });
    const submit = document.createElement("button");
    submit.className = "btn primary";
    submit.textContent = "Save check-in";
    submit.addEventListener("click", () => {
      const answers = {};
      let any = false;
      Object.entries(inputs).forEach(([id, node]) => {
        const v = node.value.trim();
        if (v) any = true;
        answers[id] = v;
      });
      if (!any) {
        if (!confirm("Save an empty check-in?")) return;
      }
      state.checkins.push({ at: Date.now(), answers });
      state.nextCheckinAt = Date.now() + CHECKIN_INTERVAL_DAYS * DAY_MS;
      save();
      go("home");
    });
    controls.appendChild(skip);
    controls.appendChild(submit);
    card.appendChild(controls);

    checkinArea.appendChild(card);

    // history
    checkinHistory.innerHTML = "";
    if (!state.checkins.length) {
      const p = document.createElement("p");
      p.className = "muted";
      p.textContent = "No check-ins yet. Your first one will live here.";
      checkinHistory.appendChild(p);
      return;
    }
    [...state.checkins].reverse().forEach(c => {
      const item = document.createElement("div");
      item.className = "history-item";
      const when = document.createElement("p");
      when.className = "when";
      when.textContent = new Date(c.at).toLocaleString(undefined, {
        weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
      });
      item.appendChild(when);
      CHECKIN_QUESTIONS.forEach(cq => {
        const v = c.answers[cq.id];
        if (!v) return;
        const p = document.createElement("p");
        p.innerHTML = `<strong>${cq.title}</strong> — ${escapeHtml(v)}`;
        item.appendChild(p);
      });
      checkinHistory.appendChild(item);
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
    }[c]));
  }

  /* ---------- unknowns / open loops ---------- */
  const unknownsList = document.getElementById("unknowns-list");

  function renderUnknowns() {
    unknownsList.innerHTML = "";
    const ids = unknownIds();
    if (!ids.length) {
      const p = document.createElement("p");
      p.className = "muted";
      p.textContent = "No open loops. You answered everything — or you haven't started yet.";
      unknownsList.appendChild(p);
      return;
    }
    ids.forEach(id => {
      const q = QUESTIONS.find(x => x.id === id);
      if (!q) return;
      const item = document.createElement("div");
      item.className = "unknown-item";
      const h = document.createElement("h3");
      h.textContent = q.title;
      item.appendChild(h);
      const since = document.createElement("p");
      since.className = "since";
      const a = state.answers[id];
      since.textContent = a?.updatedAt
        ? `Parked ${timeAgo(a.updatedAt)}`
        : "Never answered";
      item.appendChild(since);
      const btn = document.createElement("button");
      btn.className = "btn ghost";
      btn.textContent = "Try answering now";
      btn.addEventListener("click", () => {
        state.flowIndex = QUESTIONS.findIndex(x => x.id === id);
        save();
        go("flow");
      });
      item.appendChild(btn);
      unknownsList.appendChild(item);
    });
  }

  function timeAgo(ts) {
    const diff = Date.now() - ts;
    const days = Math.round(diff / DAY_MS);
    if (days < 1) return "earlier today";
    if (days === 1) return "yesterday";
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.round(days / 7)} weeks ago`;
    return `${Math.round(days / 30)} months ago`;
  }

  /* ---------- proactive notifications ---------- */
  // Fire while the page is open, when check-in becomes due.
  function maybeNotify() {
    if (!state.notifications) return;
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    if (!isCheckinDue()) return;
    const lastNotif = Number(localStorage.getItem("cesca:lastNotif") || 0);
    if (Date.now() - lastNotif < DAY_MS) return; // at most once per day
    new Notification("Cesca: it's check-in time", {
      body: "Five short questions about how the brand is going. Worth the 3 minutes.",
      silent: false
    });
    localStorage.setItem("cesca:lastNotif", String(Date.now()));
  }

  /* ---------- init ---------- */
  function init() {
    if (state.started) {
      nav.hidden = false;
      if (state.completedAt) {
        go("home");
      } else {
        go("flow");
      }
    } else {
      go("welcome");
    }
    save();
    setInterval(maybeNotify, 60 * 1000);
    maybeNotify();
  }

  init();
})();
