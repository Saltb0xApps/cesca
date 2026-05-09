/* Ariadne — personal brand companion for multi-passionate people. */

(() => {
  const STORAGE_KEY = "ariadne:v1";
  const DAY_MS = 24 * 60 * 60 * 1000;

  /* ---------- state ---------- */
  const defaultState = () => ({
    started: false,
    completedAt: null,
    flowIndex: 0,
    answers: {},      // { id: { value, unknown, ikigai?, updatedAt } }
    checkins: [],
    platformLogs: [], // [{ at, platform, followers, posts, notes }]
    nextCheckinAt: null,
    notifications: false,
    lastSeenAt: null,
    userId: null,     // set when signed into Supabase
  });

  /* ---------- Store: localStorage primary + optional Supabase backend ---------- *
   * The app always works against localStorage — Supabase is purely additive sync. *
   * If window.ARIADNE_CONFIG.supabaseUrl is set we attempt to mirror state to a   *
   * `brand_maps` row. All sync is fire-and-forget; failures don't block the UI.   */
  const Store = {
    load() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return defaultState();
        return Object.assign(defaultState(), JSON.parse(raw));
      } catch { return defaultState(); }
    },
    save(s) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
      this._maybeSyncRemote(s);
    },
    _maybeSyncRemote(s) {
      const cfg = window.ARIADNE_CONFIG;
      if (!cfg || !cfg.supabaseUrl || !cfg.supabaseAnonKey || !s.userId) return;
      // Push the entire blob — small, JSONB column. Debounced to avoid hammering.
      clearTimeout(this._syncTimer);
      this._syncTimer = setTimeout(() => {
        fetch(`${cfg.supabaseUrl}/rest/v1/brand_maps?user_id=eq.${s.userId}`, {
          method: "POST",
          headers: {
            "apikey": cfg.supabaseAnonKey,
            "Authorization": `Bearer ${cfg.supabaseAnonKey}`,
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates"
          },
          body: JSON.stringify({
            user_id: s.userId,
            answers: s.answers,
            checkins: s.checkins,
            platform_logs: s.platformLogs,
            updated_at: new Date().toISOString()
          })
        }).catch(() => {});
      }, 800);
    }
  };

  let state = Store.load();

  // Demo loader: ?demo=maya|theo|carla hydrates state from a synthetic
  // multi-passionate avatar so visitors can see the full app without doing
  // the discovery flow first. ?demo=clear wipes everything.
  (function maybeLoadDemo() {
    const params = new URLSearchParams(window.location.search);
    const key = params.get("demo");
    if (!key) return;
    if (key === "clear") {
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
      state = defaultState();
      // also strip the param so a refresh doesn't re-clear
      history.replaceState({}, "", window.location.pathname);
      return;
    }
    const fresh = window.ariadneLoadDemo && window.ariadneLoadDemo(key);
    if (fresh) {
      state = fresh;
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
      history.replaceState({}, "", window.location.pathname);
    }
  })();

  state.lastSeenAt = Date.now();
  const save = () => Store.save(state);

  /* ---------- view router ---------- */
  const views = document.querySelectorAll(".view");
  const nav = document.getElementById("nav");

  function show(viewName) {
    views.forEach(v => v.classList.toggle("active", v.dataset.view === viewName));
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function go(target) {
    if (target === "flow-resume") { state.flowIndex = 0; save(); renderQuestion(); show("flow"); return; }
    if (target === "home")     { renderHome();     show("home");     return; }
    if (target === "map")      { renderMap();      show("map");      return; }
    if (target === "checkins") { renderCheckins(); show("checkins"); return; }
    if (target === "trajectory") { renderTrajectory(); show("trajectory"); return; }
    if (target === "unknowns") { renderUnknowns(); show("unknowns"); return; }
    if (target === "flow")     { renderQuestion(); show("flow");     return; }
    if (target === "welcome")  { show("welcome"); return; }
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
  const titleEl       = document.getElementById("question-title");
  const helpEl        = document.getElementById("question-help");
  const phaseTagEl    = document.getElementById("phase-tag");
  const answerArea    = document.getElementById("answer-area");
  const backBtn       = document.getElementById("back-btn");
  const nextBtn       = document.getElementById("next-btn");
  const dontKnowBtn   = document.getElementById("dont-know-btn");
  const progressFill  = document.getElementById("progress-fill");
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
    if (state.flowIndex >= QUESTIONS.length) { finishFlow(); return; }
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
    if (q.type === "long")  return mountTextarea(q, value);
    if (q.type === "short") return mountInput(q, value);
    if (q.type === "list")  return mountList(q, value);
    if (q.type === "single" || q.type === "multi") return mountChoices(q, value);
    if (q.type === "tagged") return mountTagged(q, value);
    if (q.type === "suggested-list") return mountSuggestedList(q, value);
    if (q.type === "thread") return mountThread(q, a);
  }

  function mountTextarea(q, value) {
    const ta = document.createElement("textarea");
    ta.placeholder = q.placeholder || "";
    ta.value = (value && !Array.isArray(value)) ? value : "";
    ta.id = "answer-input";
    answerArea.appendChild(ta);
    ta.focus();
  }

  function mountInput(q, value) {
    const inp = document.createElement("input");
    inp.type = "text";
    inp.placeholder = q.placeholder || "";
    inp.value = (value && !Array.isArray(value)) ? value : "";
    inp.id = "answer-input";
    answerArea.appendChild(inp);
    inp.focus();
  }

  function mountList(q, value) {
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
        del.type = "button"; del.textContent = "–"; del.title = "Remove";
        del.addEventListener("click", () => {
          items.splice(i, 1);
          if (items.length === 0) items.push("");
          render();
        });
        row.appendChild(inp); row.appendChild(del);
        wrap.appendChild(row);
      });
      const add = document.createElement("button");
      add.type = "button"; add.className = "add-row"; add.textContent = "+ add another";
      add.addEventListener("click", () => { items.push(""); render(); });
      wrap.appendChild(add);
    };
    render();
    wrap._getValue = () => items.map(s => s.trim()).filter(Boolean);
    answerArea.appendChild(wrap);
  }

  function mountChoices(q, value) {
    const wrap = document.createElement("div");
    wrap.className = "choice-grid";
    wrap.id = "answer-input";
    const selected = new Set(Array.isArray(value) ? value : (value ? [value] : []));
    q.options.forEach(opt => {
      const lbl = document.createElement("label");
      lbl.className = "choice" + (selected.has(opt.value) ? " selected" : "");
      const inp = document.createElement("input");
      inp.type = q.type === "multi" ? "checkbox" : "radio";
      inp.name = q.id; inp.value = opt.value; inp.checked = selected.has(opt.value);
      inp.addEventListener("change", () => {
        if (q.type === "single") {
          selected.clear();
          wrap.querySelectorAll(".choice").forEach(c => c.classList.remove("selected"));
        }
        if (inp.checked) { selected.add(opt.value); lbl.classList.add("selected"); }
        else             { selected.delete(opt.value); lbl.classList.remove("selected"); }
      });
      const text = document.createElement("span");
      text.innerHTML = `<span class="label">${escapeHtml(opt.label)}</span>` +
                       (opt.hint ? `<span class="hint">${escapeHtml(opt.hint)}</span>` : "");
      lbl.appendChild(inp); lbl.appendChild(text);
      wrap.appendChild(lbl);
    });
    wrap._getValue = () => Array.from(selected);
    answerArea.appendChild(wrap);
  }

  /* ---------- tagged input ---------- */
  function mountTagged(q, value) {
    const taxonomy = window[q.taxonomy] || {};
    const wrap = document.createElement("div");
    wrap.className = "tagged-input";
    wrap.id = "answer-input";

    // selected items: array of { macro, label }
    const selected = (Array.isArray(value) ? value : [])
      .filter(v => v && typeof v === "object" && v.label)
      .map(v => ({ macro: v.macro || "custom", label: v.label }));

    const picksRow = document.createElement("div");
    picksRow.className = "picks-row";

    const search = document.createElement("input");
    search.type = "search";
    search.placeholder = "Search — try \"animation\", \"yoga\", \"writing\"…";
    search.className = "tagged-search";

    const macroList = document.createElement("div");
    macroList.className = "macro-list";

    const customRow = document.createElement("div");
    customRow.className = "custom-row";
    const customInput = document.createElement("input");
    customInput.type = "text";
    customInput.placeholder = "Or write your own — anything missing?";
    const customBtn = document.createElement("button");
    customBtn.type = "button"; customBtn.className = "btn ghost"; customBtn.textContent = "Add";
    customRow.appendChild(customInput);
    customRow.appendChild(customBtn);

    const customLabel = document.createElement("p");
    customLabel.className = "field-label";
    customLabel.textContent = "Can't find it?";

    function isPicked(macro, label) {
      return selected.some(s => s.macro === macro && s.label === label);
    }
    function togglePick(macro, label) {
      const i = selected.findIndex(s => s.macro === macro && s.label === label);
      if (i >= 0) selected.splice(i, 1);
      else selected.push({ macro, label });
      renderPicks(); renderMacros();
    }
    function addCustom(label) {
      label = (label || "").trim();
      if (!label) return;
      if (selected.some(s => s.label.toLowerCase() === label.toLowerCase())) return;
      selected.push({ macro: "custom", label });
      renderPicks();
    }

    function renderPicks() {
      picksRow.innerHTML = "";
      if (!selected.length) {
        const empty = document.createElement("p");
        empty.className = "muted picks-empty";
        empty.textContent = "Nothing picked yet. Open a category below or write your own.";
        picksRow.appendChild(empty);
        return;
      }
      const heading = document.createElement("p");
      heading.className = "field-label";
      heading.textContent = `Your picks (${selected.length})`;
      picksRow.appendChild(heading);
      const chips = document.createElement("div"); chips.className = "chip-row";
      selected.forEach(item => {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "chip selected";
        chip.innerHTML = `<span>${escapeHtml(item.label)}</span><span class="chip-x">×</span>`;
        if (item.macro && item.macro !== "custom") {
          const tag = document.createElement("span");
          tag.className = "chip-tag"; tag.textContent = item.macro;
          chip.prepend(tag);
        }
        chip.addEventListener("click", () => {
          const i = selected.findIndex(s => s.macro === item.macro && s.label === item.label);
          if (i >= 0) selected.splice(i, 1);
          renderPicks(); renderMacros();
        });
        chips.appendChild(chip);
      });
      picksRow.appendChild(chips);
    }

    function renderMacros() {
      const query = search.value.trim().toLowerCase();
      macroList.innerHTML = "";

      if (query) {
        // flat search results
        const results = [];
        Object.entries(taxonomy).forEach(([macro, subs]) => {
          subs.forEach(sub => {
            if (sub.toLowerCase().includes(query) || macro.toLowerCase().includes(query)) {
              results.push({ macro, sub });
            }
          });
        });
        if (!results.length) {
          const p = document.createElement("p"); p.className = "muted small";
          p.textContent = "Nothing matched. Try a different word — or add it as a custom tag below.";
          macroList.appendChild(p);
          return;
        }
        const heading = document.createElement("p");
        heading.className = "field-label";
        heading.textContent = `${results.length} matches`;
        macroList.appendChild(heading);
        const chips = document.createElement("div"); chips.className = "chip-row";
        results.slice(0, 60).forEach(({ macro, sub }) => {
          chips.appendChild(makeChip(sub, macro));
        });
        macroList.appendChild(chips);
        return;
      }

      // collapsible categories
      Object.entries(taxonomy).forEach(([macro, subs], idx) => {
        const details = document.createElement("details");
        details.className = "macro";
        // open if anything selected from this macro, or first 2
        const anySelected = selected.some(s => s.macro === macro);
        if (anySelected || idx < 2) details.open = true;

        const summary = document.createElement("summary");
        const count = selected.filter(s => s.macro === macro).length;
        summary.innerHTML = `<span class="macro-name">${escapeHtml(macro)}</span>` +
                            `<span class="macro-meta">${subs.length}${count ? ` · <em>${count} picked</em>` : ""}</span>`;
        details.appendChild(summary);

        const chips = document.createElement("div"); chips.className = "chip-row";
        subs.forEach(sub => chips.appendChild(makeChip(sub, macro)));
        details.appendChild(chips);
        macroList.appendChild(details);
      });
    }

    function makeChip(sub, macro) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip" + (isPicked(macro, sub) ? " selected" : "");
      chip.textContent = sub;
      chip.addEventListener("click", () => {
        togglePick(macro, sub);
      });
      return chip;
    }

    search.addEventListener("input", renderMacros);
    customBtn.addEventListener("click", () => {
      addCustom(customInput.value);
      customInput.value = "";
      customInput.focus();
    });
    customInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); customBtn.click(); }
    });

    wrap.appendChild(picksRow);
    wrap.appendChild(search);
    wrap.appendChild(macroList);
    wrap.appendChild(customLabel);
    wrap.appendChild(customRow);

    renderPicks();
    renderMacros();

    wrap._getValue = () => selected.map(s => ({ macro: s.macro, label: s.label }));
    answerArea.appendChild(wrap);
  }

  /* ---------- suggested-list input ---------- */
  function mountSuggestedList(q, value) {
    const wrap = document.createElement("div");
    wrap.className = "suggested-input";
    wrap.id = "answer-input";

    const fn = window[q.suggester];
    const suggestions = (typeof fn === "function") ? fn(state.answers) : [];
    const selected = new Set(Array.isArray(value) ? value : []);

    const intro = document.createElement("p");
    intro.className = "field-label";
    intro.textContent = suggestions.length
      ? "Hints, based on what you told me:"
      : "I don't have enough to base hints on yet — write your own below.";
    wrap.appendChild(intro);

    const chipRow = document.createElement("div");
    chipRow.className = "chip-row chip-row-wrap";

    function chipFor(label, isCustom) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip" + (selected.has(label) ? " selected" : "") + (isCustom ? " custom" : "");
      chip.textContent = label;
      chip.addEventListener("click", () => {
        if (selected.has(label)) selected.delete(label);
        else selected.add(label);
        chip.classList.toggle("selected");
      });
      return chip;
    }

    suggestions.forEach(s => chipRow.appendChild(chipFor(s, false)));

    // any user-added items already in `selected` that aren't in suggestions
    const customAdditions = [];
    [...selected].forEach(s => {
      if (!suggestions.includes(s)) customAdditions.push(s);
    });
    customAdditions.forEach(s => chipRow.appendChild(chipFor(s, true)));

    wrap.appendChild(chipRow);

    const customLabel = document.createElement("p");
    customLabel.className = "field-label spaced";
    customLabel.textContent = "Add your own:";
    wrap.appendChild(customLabel);

    const customRow = document.createElement("div");
    customRow.className = "custom-row";
    const inp = document.createElement("input");
    inp.type = "text"; inp.placeholder = q.placeholder || "Type a pillar / format / channel…";
    const btn = document.createElement("button");
    btn.type = "button"; btn.className = "btn ghost"; btn.textContent = "Add";
    btn.addEventListener("click", () => {
      const v = inp.value.trim();
      if (!v) return;
      if (!selected.has(v)) {
        selected.add(v);
        chipRow.appendChild(chipFor(v, true));
      }
      inp.value = ""; inp.focus();
    });
    inp.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); btn.click(); }
    });
    customRow.appendChild(inp); customRow.appendChild(btn);
    wrap.appendChild(customRow);

    wrap._getValue = () => [...selected];
    answerArea.appendChild(wrap);
  }

  /* ---------- thread input (with ikigai branch) ---------- */
  function mountThread(q, a) {
    const wrap = document.createElement("div");
    wrap.id = "answer-input";
    wrap.className = "thread-input";

    const ta = document.createElement("textarea");
    ta.placeholder = q.placeholder || "";
    ta.value = (a.value && !Array.isArray(a.value)) ? a.value : "";
    wrap.appendChild(ta);

    const ikigaiToggle = document.createElement("button");
    ikigaiToggle.type = "button";
    ikigaiToggle.className = "link-btn ikigai-toggle";
    ikigaiToggle.textContent = "I'm not sure yet — help me find it";
    wrap.appendChild(ikigaiToggle);

    const panel = document.createElement("div");
    panel.className = "ikigai-panel";
    panel.hidden = true;
    wrap.appendChild(panel);

    const intro = document.createElement("div");
    intro.className = "ikigai-intro";
    intro.innerHTML = `
      <p class="kicker">a guided exercise</p>
      <h3>The ikigai of your thread</h3>
      <p class="muted">Four short prompts. The thread tends to live in the overlap.
      Don't try to be clever — try to be true.</p>`;
    panel.appendChild(intro);

    const ikigai = a.ikigai || {};
    const ikigaiInputs = {};
    IKIGAI_PROMPTS.forEach(p => {
      const wrap2 = document.createElement("div");
      wrap2.className = "ikigai-q";
      const lbl = document.createElement("label");
      lbl.className = "ikigai-label";
      lbl.textContent = p.title;
      const help = document.createElement("p");
      help.className = "muted small"; help.textContent = p.help;
      const ta2 = document.createElement("textarea");
      ta2.value = ikigai[p.id] || "";
      ta2.placeholder = "Write whatever first comes — we'll edit later.";
      wrap2.appendChild(lbl); wrap2.appendChild(help); wrap2.appendChild(ta2);
      panel.appendChild(wrap2);
      ikigaiInputs[p.id] = ta2;
    });

    const synth = document.createElement("button");
    synth.type = "button";
    synth.className = "btn ghost";
    synth.textContent = "Now look at all four — and write the thread above";
    synth.addEventListener("click", () => {
      ta.scrollIntoView({ behavior: "smooth", block: "center" });
      ta.focus();
    });
    panel.appendChild(synth);

    // open by default if ikigai already engaged or thread is blank+unknown
    if (Object.keys(ikigai).length || a.unknown) {
      panel.hidden = false;
      ikigaiToggle.textContent = "Hide guided exercise";
    }
    ikigaiToggle.addEventListener("click", () => {
      panel.hidden = !panel.hidden;
      ikigaiToggle.textContent = panel.hidden
        ? "I'm not sure yet — help me find it"
        : "Hide guided exercise";
    });

    wrap._getValue = () => ta.value.trim() || null;
    wrap._getIkigai = () => {
      const out = {};
      let any = false;
      Object.entries(ikigaiInputs).forEach(([k, node]) => {
        const v = node.value.trim();
        if (v) { out[k] = v; any = true; }
      });
      return any ? out : null;
    };

    answerArea.appendChild(wrap);
  }

  function readCurrentInput() {
    const q = currentQuestion();
    const node = document.getElementById("answer-input");
    if (!node) return null;
    if (q.type === "long" || q.type === "short") {
      const v = node.value.trim();
      return v.length ? v : null;
    }
    if (q.type === "list" || q.type === "multi" || q.type === "single" ||
        q.type === "tagged" || q.type === "suggested-list") {
      const v = node._getValue();
      return v && v.length ? v : null;
    }
    if (q.type === "thread") {
      return node._getValue();
    }
    return null;
  }

  function readCurrentIkigai() {
    const q = currentQuestion();
    if (q.type !== "thread") return null;
    const node = document.getElementById("answer-input");
    return node && node._getIkigai ? node._getIkigai() : null;
  }

  nextBtn.addEventListener("click", () => {
    const q = currentQuestion();
    const v = readCurrentInput();
    const patch = { value: v, unknown: v === null };
    if (q.type === "thread") {
      const ig = readCurrentIkigai();
      if (ig) patch.ikigai = ig;
    }
    if (v === null) {
      const msg = q.type === "thread"
        ? "Leave the thread blank for now? Your ikigai answers (if any) will still be saved as scaffolding."
        : "Leave this blank and come back later? It'll be added to your open loops.";
      if (!confirm(msg)) return;
    }
    setAnswer(q.id, patch);
    state.flowIndex++;
    save();
    if (state.flowIndex >= QUESTIONS.length) finishFlow();
    else renderQuestion();
  });

  backBtn.addEventListener("click", () => {
    if (state.flowIndex > 0) { state.flowIndex--; save(); renderQuestion(); }
  });

  dontKnowBtn.addEventListener("click", () => {
    const q = currentQuestion();
    const patch = { value: null, unknown: true };
    if (q.type === "thread") {
      const ig = readCurrentIkigai();
      if (ig) patch.ikigai = ig;
    }
    setAnswer(q.id, patch);
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
  const greeting          = document.getElementById("greeting");
  const dashSentence      = document.getElementById("dash-sentence");
  const dashPillars       = document.getElementById("dash-pillars");
  const dashUnknownsCount = document.getElementById("dash-unknowns-count");
  const dashNextCheckin   = document.getElementById("dash-next-checkin");
  const checkinBanner     = document.getElementById("checkin-banner");
  const checkinBannerText = document.getElementById("checkin-banner-text");
  const startCheckinBtn   = document.getElementById("start-checkin-btn");
  const notifToggle       = document.getElementById("notif-toggle");

  function renderHome() {
    greeting.textContent = greetingText();

    const thread = answerText("thread");
    dashSentence.textContent = thread || "(your one-line brand sentence will live here once you write it)";

    dashPillars.innerHTML = "";
    const pillars = answerStringList("pillars");
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
        notifToggle.checked = false; return;
      }
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { notifToggle.checked = false; state.notifications = false; save(); return; }
      state.notifications = true; save();
      new Notification("Ariadne will check in on you.", {
        body: "We'll only ping you when it's time to reflect — every week or so.",
        silent: true
      });
    } else {
      state.notifications = false; save();
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

  /* ---------- answer helpers ---------- */
  function answerText(id) {
    const a = state.answers[id];
    if (!a || a.unknown) return "";
    const v = a.value;
    if (v === null || v === undefined) return "";
    if (Array.isArray(v)) {
      return v.map(item => typeof item === "object" ? item.label : item).join(", ");
    }
    return v;
  }
  function answerStringList(id) {
    const a = state.answers[id];
    if (!a || a.unknown || !Array.isArray(a.value)) return [];
    return a.value.map(item => typeof item === "object" ? item.label : item);
  }
  function lastLogFor(platform) {
    const rows = state.platformLogs.filter(l => l.platform === platform);
    return rows.length ? rows[rows.length - 1] : null;
  }

  function unknownIds() {
    return Object.entries(state.answers)
      .filter(([_, a]) => a.unknown ||
                          a.value === null || a.value === undefined ||
                          (Array.isArray(a.value) && a.value.length === 0) ||
                          a.value === "")
      .map(([id]) => id);
  }

  /* ---------- brand map ---------- */
  const mapContent = document.getElementById("map-content");
  const exportBtn  = document.getElementById("export-btn");

  function renderMap() {
    mapContent.innerHTML = "";
    QUESTIONS.forEach(q => {
      const a = state.answers[q.id];
      const block = document.createElement("article");
      block.className = "map-block";
      const h = document.createElement("h3");
      h.textContent = q.mapLabel || q.title;
      block.appendChild(h);

      const isEmpty = !a || a.unknown || a.value === null || a.value === "" ||
                      (Array.isArray(a.value) && a.value.length === 0);

      if (isEmpty) {
        const ans = document.createElement("div");
        ans.className = "map-answer empty";
        ans.textContent = a && a.unknown ? "(parked — open loop)" : "(not answered yet)";
        block.appendChild(ans);
      } else if (q.type === "tagged") {
        // group by macro
        const grouped = {};
        a.value.forEach(item => {
          const m = item.macro || "custom";
          (grouped[m] = grouped[m] || []).push(item.label);
        });
        const div = document.createElement("div");
        div.className = "tagged-map";
        Object.entries(grouped).forEach(([macro, labels]) => {
          const row = document.createElement("div");
          row.className = "tagged-map-row";
          const m = document.createElement("span");
          m.className = "tagged-map-macro";
          m.textContent = macro === "custom" ? "Your own" : macro;
          row.appendChild(m);
          const items = document.createElement("span");
          items.className = "tagged-map-items";
          items.textContent = labels.join(" · ");
          row.appendChild(items);
          div.appendChild(row);
        });
        block.appendChild(div);
      } else if (Array.isArray(a.value)) {
        if (q.type === "multi") {
          const labels = a.value.map(v => {
            const opt = (q.options || []).find(o => o.value === v);
            return opt ? opt.label : v;
          });
          const ans = document.createElement("div");
          ans.className = "map-answer";
          ans.textContent = labels.join(" · ");
          block.appendChild(ans);
        } else {
          const ul = document.createElement("ul");
          a.value.forEach(item => {
            const li = document.createElement("li");
            li.textContent = typeof item === "object" ? item.label : item;
            ul.appendChild(li);
          });
          block.appendChild(ul);
        }
      } else {
        const ans = document.createElement("div");
        ans.className = "map-answer";
        ans.textContent = a.value;
        block.appendChild(ans);
      }

      // ikigai sub-display on thread
      if (q.id === "thread" && a && a.ikigai && Object.keys(a.ikigai).length) {
        const ik = document.createElement("div");
        ik.className = "ikigai-summary";
        const head = document.createElement("p");
        head.className = "field-label"; head.textContent = "From your ikigai exercise:";
        ik.appendChild(head);
        IKIGAI_PROMPTS.forEach(p => {
          if (!a.ikigai[p.id]) return;
          const row = document.createElement("p");
          row.className = "ikigai-row";
          row.innerHTML = `<em>${escapeHtml(p.title)}</em><br/>${escapeHtml(a.ikigai[p.id])}`;
          ik.appendChild(row);
        });
        block.appendChild(ik);
      }

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
      const isEmpty = !a || a.unknown || a.value === null || a.value === "" ||
                      (Array.isArray(a.value) && a.value.length === 0);
      if (isEmpty) {
        lines.push(a && a.unknown ? "(parked — open loop)" : "(not answered yet)");
      } else if (q.type === "tagged") {
        const grouped = {};
        a.value.forEach(item => {
          const m = item.macro || "custom";
          (grouped[m] = grouped[m] || []).push(item.label);
        });
        Object.entries(grouped).forEach(([macro, labels]) => {
          lines.push(`  ${macro}: ${labels.join(", ")}`);
        });
      } else if (Array.isArray(a.value)) {
        if (q.type === "multi") {
          lines.push(a.value.map(v => {
            const opt = (q.options || []).find(o => o.value === v);
            return opt ? opt.label : v;
          }).join(", "));
        } else {
          a.value.forEach(item => lines.push(`- ${typeof item === "object" ? item.label : item}`));
        }
      } else {
        lines.push(a.value);
      }
      if (q.id === "thread" && a && a.ikigai) {
        lines.push("");
        lines.push("  Ikigai notes:");
        IKIGAI_PROMPTS.forEach(p => {
          if (a.ikigai[p.id]) lines.push(`  · ${p.title} — ${a.ikigai[p.id]}`);
        });
      }
      lines.push("");
    });
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = "my-brand-map.txt"; link.click();
    URL.revokeObjectURL(url);
  });

  /* ---------- trajectory ---------- */
  const trajectoryEmpty   = document.getElementById("trajectory-empty");
  const trajectoryContent = document.getElementById("trajectory-content");
  let _trajectoryCharts = [];

  function renderTrajectory() {
    // tear down existing charts (avoid Chart.js leaking canvases on re-render)
    _trajectoryCharts.forEach(c => { try { c.destroy(); } catch {} });
    _trajectoryCharts = [];
    trajectoryContent.innerHTML = "";

    const logs = state.platformLogs;
    if (!logs.length) {
      trajectoryEmpty.hidden = false;
      return;
    }
    trajectoryEmpty.hidden = true;

    if (typeof Chart === "undefined") {
      const note = document.createElement("p");
      note.className = "muted";
      note.textContent = "Chart library didn't load — check your network.";
      trajectoryContent.appendChild(note);
      return;
    }

    // group logs by platform
    const byPlatform = {};
    logs.forEach(l => {
      (byPlatform[l.platform] = byPlatform[l.platform] || []).push(l);
    });
    Object.values(byPlatform).forEach(arr => arr.sort((a, b) => a.at - b.at));

    // pillars/formats overlay band — most recent answers, shown as text per check-in
    const overlayLines = state.checkins.map(c => ({
      at: c.at,
      note: (c.answers.next || c.answers.adjust || "").slice(0, 60)
    })).filter(o => o.note);

    // a section per platform with a followers chart and posts chart side-by-side
    Object.entries(byPlatform).forEach(([platform, arr]) => {
      const card = document.createElement("article");
      card.className = "trajectory-card";
      card.innerHTML = `<h3>${escapeHtml(platform)}</h3>`;

      const grid = document.createElement("div");
      grid.className = "trajectory-charts";

      const fCanvas = document.createElement("canvas");
      const pCanvas = document.createElement("canvas");
      grid.appendChild(wrapChart(fCanvas, "Followers"));
      grid.appendChild(wrapChart(pCanvas, "Posts shipped"));
      card.appendChild(grid);

      const followersData = arr.filter(l => l.followers != null).map(l => ({ x: l.at, y: l.followers }));
      const postsData = arr.filter(l => l.posts != null).map(l => ({ x: l.at, y: l.posts }));

      _trajectoryCharts.push(new Chart(fCanvas.getContext("2d"), buildLineConfig("Followers", followersData)));
      _trajectoryCharts.push(new Chart(pCanvas.getContext("2d"), buildLineConfig("Posts", postsData)));

      // last-known notes row
      if (arr[arr.length - 1].notes) {
        const noteRow = document.createElement("p");
        noteRow.className = "trajectory-note muted small";
        noteRow.textContent = `Latest note: ${arr[arr.length - 1].notes}`;
        card.appendChild(noteRow);
      }
      trajectoryContent.appendChild(card);
    });

    // overlay log: last few "things you said you'd try"
    if (overlayLines.length) {
      const overlay = document.createElement("article");
      overlay.className = "trajectory-card";
      overlay.innerHTML = `<h3>What you said you'd try</h3>`;
      const ul = document.createElement("ul");
      ul.className = "trajectory-overlay";
      overlayLines.slice(-6).reverse().forEach(o => {
        const li = document.createElement("li");
        li.innerHTML = `<span class="when">${shortDate(o.at)}</span> · ${escapeHtml(o.note)}`;
        ul.appendChild(li);
      });
      overlay.appendChild(ul);
      trajectoryContent.appendChild(overlay);
    }
  }

  function wrapChart(canvas, label) {
    const w = document.createElement("div");
    w.className = "chart-wrap";
    const lbl = document.createElement("p");
    lbl.className = "chart-label"; lbl.textContent = label;
    w.appendChild(lbl); w.appendChild(canvas);
    return w;
  }

  function buildLineConfig(label, data) {
    return {
      type: "line",
      data: {
        datasets: [{
          label,
          data,
          borderColor: "#c2410c",
          backgroundColor: "rgba(194,65,12,0.12)",
          fill: true,
          tension: 0.25,
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 2,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            type: "time" in (Chart.registry?.scales || {}) ? "time" : "linear",
            ticks: {
              callback: (v) => shortDate(v),
              color: "#837b6d",
            },
            grid: { color: "rgba(0,0,0,0.04)" }
          },
          y: {
            beginAtZero: true,
            ticks: { color: "#837b6d" },
            grid: { color: "rgba(0,0,0,0.04)" }
          }
        }
      }
    };
  }

  function shortDate(ts) {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  /* ---------- check-ins ---------- */
  const checkinArea    = document.getElementById("checkin-area");
  const checkinHistory = document.getElementById("checkin-history");

  function renderCheckins() {
    checkinArea.innerHTML = "";
    const card = document.createElement("div"); card.className = "question-card";
    const tag = document.createElement("p"); tag.className = "phase-tag";
    tag.textContent = isCheckinDue() ? "It's time" : "A check-in, whenever you want one";
    card.appendChild(tag);
    const h = document.createElement("h2"); h.textContent = "Five short questions."; card.appendChild(h);
    const help = document.createElement("p"); help.className = "question-help";
    help.textContent = "Be short. Be honest. We're collecting truth, not polish.";
    card.appendChild(help);

    const inputs = {};
    CHECKIN_QUESTIONS.forEach(cq => {
      const lbl = document.createElement("label");
      lbl.className = "checkin-label"; lbl.textContent = cq.title;
      card.appendChild(lbl);
      const node = cq.type === "long" ? document.createElement("textarea") : document.createElement("input");
      if (cq.type !== "long") node.type = "text";
      node.placeholder = cq.placeholder || "";
      card.appendChild(node);
      inputs[cq.id] = node;
    });

    /* ---- per-platform numbers grid ---- */
    const platforms = answerStringList("channels");
    const logInputs = {};
    if (platforms.length) {
      const lbl = document.createElement("label");
      lbl.className = "checkin-label";
      lbl.innerHTML = "Your numbers this week <span class='muted small'>(optional, but the trajectory chart needs them)</span>";
      card.appendChild(lbl);

      const table = document.createElement("table");
      table.className = "log-grid";
      table.innerHTML = `
        <thead>
          <tr>
            <th>Platform</th>
            <th>Followers</th>
            <th>Posts shipped</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody></tbody>`;
      const tbody = table.querySelector("tbody");
      platforms.forEach(p => {
        const tr = document.createElement("tr");
        const last = lastLogFor(p);
        tr.innerHTML = `
          <td><strong>${escapeHtml(p)}</strong></td>
          <td><input type="number" min="0" data-field="followers" placeholder="${last && last.followers != null ? last.followers : '—'}" /></td>
          <td><input type="number" min="0" data-field="posts" placeholder="0" /></td>
          <td><input type="text" data-field="notes" placeholder="format / pillar tested" /></td>
        `;
        tbody.appendChild(tr);
        logInputs[p] = {
          followers: tr.querySelector('[data-field="followers"]'),
          posts:     tr.querySelector('[data-field="posts"]'),
          notes:     tr.querySelector('[data-field="notes"]'),
        };
      });
      card.appendChild(table);
    } else {
      const note = document.createElement("p");
      note.className = "muted small";
      note.style.marginTop = "16px";
      note.innerHTML = "Pick your platforms in the discovery flow and the per-platform log will appear here next time.";
      card.appendChild(note);
    }

    const controls = document.createElement("div"); controls.className = "flow-controls";
    const skip = document.createElement("button");
    skip.className = "btn ghost"; skip.textContent = "Not today";
    skip.addEventListener("click", () => {
      state.nextCheckinAt = Date.now() + 2 * DAY_MS; save(); go("home");
    });
    const submit = document.createElement("button");
    submit.className = "btn primary"; submit.textContent = "Save check-in";
    submit.addEventListener("click", () => {
      const answers = {}; let any = false;
      Object.entries(inputs).forEach(([id, node]) => {
        const v = node.value.trim(); if (v) any = true;
        answers[id] = v;
      });
      if (!any && !confirm("Save an empty check-in?")) return;
      const now = Date.now();
      state.checkins.push({ at: now, answers });

      // store any platform log rows the user filled in
      Object.entries(logInputs).forEach(([platform, fields]) => {
        const followers = fields.followers.value.trim();
        const posts     = fields.posts.value.trim();
        const notes     = fields.notes.value.trim();
        if (!followers && !posts && !notes) return; // skip empty rows
        state.platformLogs.push({
          at: now,
          platform,
          followers: followers ? Number(followers) : null,
          posts:     posts     ? Number(posts)     : null,
          notes:     notes || null
        });
      });

      state.nextCheckinAt = Date.now() + CHECKIN_INTERVAL_DAYS * DAY_MS;
      save(); go("home");
    });
    controls.appendChild(skip); controls.appendChild(submit);
    card.appendChild(controls);
    checkinArea.appendChild(card);

    checkinHistory.innerHTML = "";
    if (!state.checkins.length) {
      const p = document.createElement("p"); p.className = "muted";
      p.textContent = "No check-ins yet. Your first one will live here.";
      checkinHistory.appendChild(p); return;
    }
    [...state.checkins].reverse().forEach(c => {
      const item = document.createElement("div"); item.className = "history-item";
      const when = document.createElement("p"); when.className = "when";
      when.textContent = new Date(c.at).toLocaleString(undefined, {
        weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
      });
      item.appendChild(when);
      CHECKIN_QUESTIONS.forEach(cq => {
        const v = c.answers[cq.id]; if (!v) return;
        const p = document.createElement("p");
        p.innerHTML = `<strong>${escapeHtml(cq.title)}</strong> — ${escapeHtml(v)}`;
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
      const p = document.createElement("p"); p.className = "muted";
      p.textContent = "No open loops. You answered everything — or you haven't started yet.";
      unknownsList.appendChild(p); return;
    }
    ids.forEach(id => {
      const q = QUESTIONS.find(x => x.id === id); if (!q) return;
      const item = document.createElement("div"); item.className = "unknown-item";
      const h = document.createElement("h3"); h.textContent = q.title; item.appendChild(h);
      const since = document.createElement("p"); since.className = "since";
      const a = state.answers[id];
      since.textContent = a?.updatedAt ? `Parked ${timeAgo(a.updatedAt)}` : "Never answered";
      item.appendChild(since);
      const btn = document.createElement("button"); btn.className = "btn ghost";
      btn.textContent = "Try answering now";
      btn.addEventListener("click", () => {
        state.flowIndex = QUESTIONS.findIndex(x => x.id === id); save(); go("flow");
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
  function maybeNotify() {
    if (!state.notifications) return;
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    if (!isCheckinDue()) return;
    const lastNotif = Number(localStorage.getItem("ariadne:lastNotif") || 0);
    if (Date.now() - lastNotif < DAY_MS) return;
    new Notification("Ariadne: it's check-in time", {
      body: "Five short questions about how the brand is going. Worth the 3 minutes.",
      silent: false
    });
    localStorage.setItem("ariadne:lastNotif", String(Date.now()));
  }

  /* ---------- init ---------- */
  function init() {
    if (state.started) {
      nav.hidden = false;
      if (state.completedAt) go("home"); else go("flow");
    } else {
      go("welcome");
    }
    save();
    setInterval(maybeNotify, 60 * 1000);
    maybeNotify();
  }

  init();
})();
