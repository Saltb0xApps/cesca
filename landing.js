/* Ariadne — landing page logic.
   Handles:
     · the labyrinth thread animation (timing + replay on intersection)
     · the waitlist form (stub persistence + optional Formspree endpoint)
*/

/* ------------------------------------------------------------------ *
 *  ANIMATION                                                         *
 *  The thread is drawn via stroke-dashoffset. We measure the path's  *
 *  length, set dasharray to that length, then animate offset to 0.   *
 * ------------------------------------------------------------------ */
(() => {
  const svg = document.getElementById("labyrinth");
  if (!svg) return;
  const thread = svg.querySelector("#thread");
  const exitLabel = svg.querySelector(".exit-label");
  const ariadne = svg.querySelector(".ariadne-glow");
  if (!thread) return;

  const length = thread.getTotalLength();
  thread.style.strokeDasharray  = length;
  thread.style.strokeDashoffset = length;

  function play() {
    // ariadne pulses on
    ariadne && ariadne.animate(
      [{ opacity: 0.2, transform: "scale(0.7)" },
       { opacity: 1.0, transform: "scale(1.0)" }],
      { duration: 900, fill: "forwards", easing: "ease-out" }
    );
    // thread draws
    thread.animate(
      [{ strokeDashoffset: length },
       { strokeDashoffset: 0 }],
      { duration: 6000, delay: 800, fill: "forwards", easing: "cubic-bezier(.65,.05,.36,1)" }
    );
    // exit label fades in near the end
    setTimeout(() => {
      exitLabel && exitLabel.animate(
        [{ opacity: 0, transform: "translateY(4px)" },
         { opacity: 1, transform: "translateY(0)" }],
        { duration: 700, fill: "forwards", easing: "ease-out" }
      );
    }, 6200);
  }

  // play once on load, then on demand if user scrolls back
  let played = false;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting && !played) { played = true; play(); }
    });
  }, { threshold: 0.4 });
  obs.observe(svg);
})();

/* ------------------------------------------------------------------ *
 *  WAITLIST FORM                                                     *
 *  Saves locally always; if FORMSPREE_ENDPOINT is set, also POSTs    *
 *  there. Drop a Formspree (or any form-handler) URL below to start  *
 *  collecting signups for real.                                      *
 * ------------------------------------------------------------------ */

// TODO: paste your Formspree / Resend / backend endpoint here when ready.
// e.g. "https://formspree.io/f/yourFormId"
const FORMSPREE_ENDPOINT = "";

const WAITLIST_KEY = "ariadne:waitlist";

(() => {
  const form = document.getElementById("waitlist-form");
  const success = document.getElementById("waitlist-success");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    if (!data.email || !/^\S+@\S+\.\S+$/.test(data.email)) {
      alert("That email doesn't look quite right. Try again?");
      return;
    }

    // 1. Always store locally as a stub. Useful while there's no backend.
    try {
      const list = JSON.parse(localStorage.getItem(WAITLIST_KEY) || "[]");
      list.push({ ...data, at: Date.now() });
      localStorage.setItem(WAITLIST_KEY, JSON.stringify(list));
    } catch {}

    // 2. If a real endpoint is configured, POST to it.
    if (FORMSPREE_ENDPOINT) {
      try {
        await fetch(FORMSPREE_ENDPOINT, {
          method: "POST",
          headers: { "Accept": "application/json", "Content-Type": "application/json" },
          body: JSON.stringify(data)
        });
      } catch (err) {
        console.warn("Waitlist submit failed:", err);
      }
    } else {
      // dev-mode visibility
      console.info("[Ariadne waitlist — dev mode] saved locally:", data);
    }

    form.hidden = true;
    success.hidden = false;
    success.scrollIntoView({ behavior: "smooth", block: "center" });
  });
})();
