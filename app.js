// StudentStash — investment planner logic
// Educational only. Not financial advice.

const ASSET_COLORS = {
  hysa:   "#4ade80",
  index:  "#5eead4",
  intl:   "#818cf8",
  bonds:  "#fbbf24",
  crypto: "#f472b6",
  stocks: "#60a5fa",
};

const ASSET_LABELS = {
  hysa:   "High-Yield Savings",
  index:  "US Index Fund (VTI/VOO)",
  intl:   "International Index (VXUS)",
  bonds:  "Bonds (BND)",
  crypto: "Crypto (BTC/ETH)",
  stocks: "Individual Stocks",
};

// Long-run nominal return assumptions (rough, educational)
const ASSET_RETURNS = {
  hysa:   0.04,
  index:  0.09,
  intl:   0.07,
  bonds:  0.04,
  crypto: 0.10, // very wide variance, treated optimistically here
  stocks: 0.08,
};

function buildAllocation({ age, risk, goal, hasDebt }) {
  // Short-term goals → mostly cash
  if (goal === "short") {
    return { hysa: 100 };
  }

  // "Just learning" → small, safe practice allocation
  if (goal === "learn") {
    return { hysa: 40, index: 50, stocks: 10 };
  }

  let alloc;

  if (goal === "med") {
    if (risk === "low")  alloc = { hysa: 40, bonds: 20, index: 30, intl: 10 };
    if (risk === "med")  alloc = { hysa: 20, bonds: 15, index: 45, intl: 15, stocks: 5 };
    if (risk === "high") alloc = { hysa: 10, bonds: 10, index: 55, intl: 15, stocks: 5, crypto: 5 };
  } else {
    // long-term
    if (risk === "low")  alloc = { hysa: 15, bonds: 15, index: 50, intl: 20 };
    if (risk === "med")  alloc = { hysa: 10, bonds: 5,  index: 60, intl: 20, stocks: 5 };
    if (risk === "high") alloc = { hysa: 5,             index: 65, intl: 15, stocks: 8, crypto: 7 };
  }

  // If you carry high-interest debt, divert most "investing" cash to debt payoff
  // (represented as HYSA here = "set this aside, but actually pay down debt").
  if (hasDebt) {
    alloc = { hysa: 80, index: 20 };
  }

  return alloc;
}

function blendedReturn(alloc) {
  let r = 0;
  for (const [k, pct] of Object.entries(alloc)) {
    r += (pct / 100) * (ASSET_RETURNS[k] || 0);
  }
  return r;
}

// Future value of a recurring monthly contribution at annual rate r over n years.
// FV = PMT * [((1+i)^N - 1)/i], i = r/12, N = 12n
function projectGrowth(monthly, annualRate, years) {
  const i = annualRate / 12;
  const N = years * 12;
  if (i === 0) return monthly * N;
  return monthly * ((Math.pow(1 + i, N) - 1) / i);
}

function fmt(n) {
  if (n >= 1_000_000) return "$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 10_000)    return "$" + Math.round(n / 1000) + "k";
  return "$" + Math.round(n).toLocaleString();
}

function buildTips({ monthly, age, risk, goal, hasDebt, alloc }) {
  const tips = [];

  if (hasDebt) {
    tips.push({
      kind: "danger",
      text: "🚨 Pay off the >7% debt first. We've parked 80% of your money in 'savings' as a placeholder, but in reality every spare dollar should go to that debt — paying off a 22% credit card is a guaranteed 22% return that no investment can match.",
    });
  }

  if (monthly < 10) {
    tips.push({
      kind: "warn",
      text: "💡 Even $5/mo into an index fund builds the habit. Use a broker that supports fractional shares (Fidelity, Schwab, Robinhood) so you can buy partial shares of VTI or VOO.",
    });
  } else if (monthly <= 50) {
    tips.push({
      kind: "good",
      text: `💪 $${monthly}/mo is a great starting point. Set up an automatic transfer on payday — automation beats willpower.`,
    });
  } else if (monthly >= 200) {
    tips.push({
      kind: "good",
      text: `🔥 $${monthly}/mo is serious. If you have earned income, max your Roth IRA first ($7,000/yr in 2026 = ~$583/mo). Tax-free growth for 40+ years is unbeatable.`,
    });
  }

  if (age <= 22 && goal === "long") {
    tips.push({
      kind: "good",
      text: "⏳ Your biggest advantage is time. A dollar invested at 18 is worth ~10× a dollar invested at 40 (at ~7% real return). Don't waste this window worrying about picking the 'best' fund — just start.",
    });
  }

  if (alloc.crypto) {
    tips.push({
      kind: "warn",
      text: `🪙 Your crypto slice is ${alloc.crypto}%. Buy only BTC and/or ETH on a major exchange (Coinbase, Kraken). Skip altcoins, meme coins, NFTs, and any "yield" platform promising fixed returns.`,
    });
  }

  if (goal === "short") {
    tips.push({
      kind: "warn",
      text: "📅 Money you need within 1–2 years should NOT be in the stock market. A 30% drop right before you need it can wreck your plans. Stick to a high-yield savings account (Ally, Marcus, Wealthfront Cash, ~4–5%).",
    });
  }

  if (risk === "low" && goal === "long") {
    tips.push({
      kind: "warn",
      text: "🧘 You said you'd panic in a 30% drop — that's normal. But for a 30+ year horizon, being too conservative costs more than crashes do. Try investing a small amount and watch how you actually feel during the next dip. Reading 'The Psychology of Money' helps.",
    });
  }

  if (risk === "high") {
    tips.push({
      kind: "good",
      text: "🎯 High risk tolerance is great for compounding — but only if you actually stay invested when things drop. Promise yourself: no selling on red days.",
    });
  }

  // Always include core habits
  tips.push({
    kind: "good",
    text: "🏦 Open a free brokerage account at Fidelity, Schwab, or Vanguard. Avoid apps that gamify trading or push options. You want boring.",
  });
  tips.push({
    kind: "good",
    text: "🔁 Set up an automatic monthly transfer on the day you get paid. This is dollar-cost averaging — the single most reliable strategy for beginners.",
  });
  tips.push({
    kind: "good",
    text: "🛡️ Before stocks, build a $500–$1,000 emergency fund in a HYSA. It prevents you from selling investments at the worst time when life happens.",
  });

  return tips;
}

function renderAllocation(alloc, monthly) {
  const container = document.getElementById("allocation");
  container.innerHTML = "";
  // Sort by % desc
  const entries = Object.entries(alloc).sort((a, b) => b[1] - a[1]);
  for (const [key, pct] of entries) {
    if (!pct) continue;
    const dollars = (monthly * pct) / 100;
    const row = document.createElement("div");
    row.className = "alloc-row";
    row.innerHTML = `
      <div class="alloc-label">${ASSET_LABELS[key] || key}</div>
      <div class="alloc-bar"><div class="alloc-fill" style="width:${pct}%; background:${ASSET_COLORS[key] || "#888"}"></div></div>
      <div class="alloc-amount">$${dollars.toFixed(2)} <span style="color:var(--muted)">(${pct}%)</span></div>
    `;
    container.appendChild(row);
  }
}

function renderProjection(monthly, rate) {
  const container = document.getElementById("projection");
  container.innerHTML = "";
  const horizons = [1, 5, 10, 20, 40];
  for (const yrs of horizons) {
    const fv = projectGrowth(monthly, rate, yrs);
    const contributed = monthly * 12 * yrs;
    const gain = fv - contributed;
    const cell = document.createElement("div");
    cell.className = "proj-cell";
    cell.innerHTML = `
      <div class="proj-label">In ${yrs} year${yrs > 1 ? "s" : ""}</div>
      <div class="proj-value">${fmt(fv)}</div>
      <div class="proj-sub">${fmt(contributed)} in + ${fmt(gain)} growth</div>
    `;
    container.appendChild(cell);
  }
}

function renderTips(tips) {
  const list = document.getElementById("tipsList");
  list.innerHTML = "";
  for (const t of tips) {
    const li = document.createElement("li");
    li.className = t.kind || "";
    li.textContent = t.text;
    list.appendChild(li);
  }
}

function renderSummary({ monthly, age, goal, alloc, rate }) {
  const goalText = {
    short: "saving for something within the next year or two",
    med:   "building wealth over the next 3–7 years",
    long:  "investing for long-term wealth",
    learn: "learning the ropes of investing",
  }[goal];

  const blended = (rate * 100).toFixed(1);
  document.getElementById("summary").innerHTML =
    `You're <strong>${age}</strong>, putting away <strong>$${monthly}/mo</strong>, and ${goalText}. ` +
    `Based on your risk tolerance, the suggested mix has a <strong>~${blended}% blended annual return</strong> historically. ` +
    `Below is what that could look like if you keep going.`;
}

document.getElementById("plannerForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const monthly = parseFloat(document.getElementById("monthly").value);
  const age = parseInt(document.getElementById("age").value, 10);
  const risk = document.getElementById("risk").value;
  const goal = document.getElementById("goal").value;
  const hasDebt = document.getElementById("debt").checked;

  if (!monthly || !age || !risk || !goal) return;

  const alloc = buildAllocation({ age, risk, goal, hasDebt });
  const rate = blendedReturn(alloc);
  const tips = buildTips({ monthly, age, risk, goal, hasDebt, alloc });

  renderSummary({ monthly, age, goal, alloc, rate });
  renderAllocation(alloc, monthly);
  renderProjection(monthly, rate);
  renderTips(tips);

  const results = document.getElementById("results");
  results.classList.remove("hidden");
  results.scrollIntoView({ behavior: "smooth", block: "start" });
});
