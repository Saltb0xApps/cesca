"use strict";

const $ = (sel) => document.querySelector(sel);

let selectedFile = null;
let rubric = [];

function color(score10) {
  if (score10 >= 7) return "var(--good)";
  if (score10 >= 4) return "var(--warn)";
  return "var(--bad)";
}

async function loadHealth() {
  try {
    const h = await (await fetch("/api/health")).json();
    const badge = $("#backend-badge");
    if (h.scorer === "ollama") {
      badge.textContent = h.ollama_available
        ? `Ollama · ${h.ollama_model}`
        : `Ollama offline → built-in scorer`;
    } else {
      badge.textContent = "Built-in scorer";
    }
  } catch (e) {
    $("#backend-badge").textContent = "offline";
  }
}

async function loadRubric() {
  rubric = await (await fetch("/api/rubric")).json();
}

function setStatus(msg, isError = false) {
  const el = $("#status");
  el.textContent = msg || "";
  el.classList.toggle("error", isError);
}

function pickFile(file) {
  if (!file) return;
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    setStatus("Please choose a PDF file.", true);
    return;
  }
  selectedFile = file;
  $("#filename").textContent = file.name;
  $("#score-btn").disabled = false;
  setStatus("");
}

function labelFor(key) {
  const d = rubric.find((r) => r.key === key);
  return d ? d.label : key;
}

function renderResult(r) {
  $("#result").classList.remove("hidden");
  $("#result-name").textContent = r.filename || "Result";
  $("#overall").textContent = r.overall;
  $(".gauge").style.setProperty("--p", `${r.overall}%`);
  $("#summary").textContent = r.summary || "";
  const backend = r.backend === "ollama" ? `Scored by Ollama (${r.model})` : "Scored by built-in engine";
  $("#result-backend").textContent = backend;

  const container = $("#dimensions");
  container.innerHTML = "";
  for (const key of Object.keys(r.dimensions)) {
    const v = r.dimensions[key];
    const div = document.createElement("div");
    div.className = "dim";
    div.innerHTML = `
      <div class="dim-row">
        <span class="dim-label">${labelFor(key)}</span>
        <span>${v.toFixed(1)}/10</span>
      </div>
      <div class="bar"><span style="width:${v * 10}%;background:${color(v)}"></span></div>
      <div class="dim-fb">${(r.feedback && r.feedback[key]) || ""}</div>`;
    container.appendChild(div);
  }
}

async function scoreCv() {
  if (!selectedFile) return;
  $("#score-btn").disabled = true;
  setStatus("Scoring locally…");
  const fd = new FormData();
  fd.append("file", selectedFile);
  try {
    const res = await fetch("/api/score", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Scoring failed.");
    renderResult(data);
    setStatus("Done. Saved to local history.");
    loadHistory();
  } catch (e) {
    setStatus(e.message, true);
  } finally {
    $("#score-btn").disabled = false;
  }
}

async function loadHistory() {
  const list = $("#history");
  const items = await (await fetch("/api/scores")).json();
  list.innerHTML = "";
  if (items.length === 0) {
    list.innerHTML = `<li class="muted">No CVs scored yet.</li>`;
    return;
  }
  for (const it of items) {
    const li = document.createElement("li");
    const date = new Date(it.created_at).toLocaleString();
    li.innerHTML = `
      <span class="h-score" style="color:${color(it.overall / 10)}">${it.overall}</span>
      <span class="h-name" title="${it.filename}">${it.filename}</span>
      <span class="h-date">${date}</span>
      <button class="h-del" data-id="${it.id}">Delete</button>`;
    li.querySelector(".h-del").addEventListener("click", async (ev) => {
      ev.stopPropagation();
      await fetch(`/api/scores/${it.id}`, { method: "DELETE" });
      loadHistory();
    });
    li.addEventListener("click", async () => {
      const detail = await (await fetch(`/api/scores/${it.id}`)).json();
      renderResult({
        filename: detail.filename,
        overall: detail.overall,
        summary: detail.summary,
        backend: detail.backend,
        model: detail.model,
        dimensions: detail.dimensions,
        feedback: detail.feedback,
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    list.appendChild(li);
  }
}

function wireDropzone() {
  const dz = $("#dropzone");
  const input = $("#file");
  input.addEventListener("change", () => pickFile(input.files[0]));
  ["dragenter", "dragover"].forEach((ev) =>
    dz.addEventListener(ev, (e) => {
      e.preventDefault();
      dz.classList.add("drag");
    })
  );
  ["dragleave", "drop"].forEach((ev) =>
    dz.addEventListener(ev, (e) => {
      e.preventDefault();
      dz.classList.remove("drag");
    })
  );
  dz.addEventListener("drop", (e) => {
    const f = e.dataTransfer.files[0];
    pickFile(f);
  });
}

window.addEventListener("DOMContentLoaded", () => {
  wireDropzone();
  $("#score-btn").addEventListener("click", scoreCv);
  loadHealth();
  loadRubric();
  loadHistory();
});
