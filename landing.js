/* Ariadne — landing page logic.
   Handles:
     · the 6-scene narrative animation (GSAP + ScrollTrigger if available;
       graceful CSS fallback otherwise + reduced-motion support)
     · the waitlist form (localStorage stub + optional Formspree + optional Supabase)
*/

/* ------------------------------------------------------------------ *
 *  NARRATIVE ANIMATION                                               *
 * ------------------------------------------------------------------ */
(() => {
  const scenes = document.querySelectorAll(".scene");
  if (!scenes.length) return;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion) {
    // Show every scene immediately, no scrubbing.
    scenes.forEach(s => s.classList.add("visible"));
    return;
  }

  const hasGSAP = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";

  if (hasGSAP) {
    gsap.registerPlugin(ScrollTrigger);
    const isWide = window.matchMedia("(min-width: 880px)").matches;

    scenes.forEach((scene, idx) => {
      const stage = scene.querySelector(".scene-stage");
      const art  = scene.querySelector(".scene-art");
      if (!stage) return;

      // Pin each scene-stage so each scene holds the viewport for its own
      // scroll length. No opacity dance — the scene is visible from the start
      // and only the per-scene SVG details get scrubbed by scroll position.
      if (isWide) {
        ScrollTrigger.create({
          trigger: scene,
          start: "top top",
          end: "bottom top",
          pin: stage,
          pinSpacing: true,
        });
      }

      // Per-scene art animations
      const artType = art && art.dataset.art;

      if (artType === "walls") {
        const lines = scene.querySelectorAll(".walls-fading line");
        gsap.from(lines, {
          opacity: 0,
          stagger: 0.06,
          scrollTrigger: { trigger: scene, start: "top 80%", end: "top 30%", scrub: true }
        });
      }

      if (artType === "labyrinth") {
        const rects = scene.querySelectorAll(".labyrinth-full rect");
        const words = scene.querySelectorAll(".passion-words text");
        gsap.from(rects, {
          opacity: 0, stagger: 0.1,
          scrollTrigger: { trigger: scene, start: "top 80%", end: "top 30%", scrub: true }
        });
        gsap.from(words, {
          opacity: 0, y: 6, stagger: 0.05,
          scrollTrigger: { trigger: scene, start: "top 60%", end: "top 20%", scrub: true }
        });
      }

      if (artType === "thread-need") {
        const path = scene.querySelector(".thread-line");
        if (path) {
          const len = path.getTotalLength();
          path.style.strokeDasharray = len;
          path.style.strokeDashoffset = len;
          gsap.to(path, {
            strokeDashoffset: 0,
            scrollTrigger: { trigger: scene, start: "top 80%", end: "top 20%", scrub: true }
          });
        }
      }

      if (artType === "ariadne") {
        const skein = scene.querySelector(".skein");
        const tail  = scene.querySelector(".skein-tail");
        if (skein) {
          gsap.fromTo(skein, { x: 0 }, {
            x: 40, // moves toward Theseus
            scrollTrigger: { trigger: scene, start: "top 70%", end: "top 20%", scrub: true }
          });
        }
        if (tail) {
          const len = tail.getTotalLength ? tail.getTotalLength() : 50;
          tail.style.strokeDasharray = len;
          tail.style.strokeDashoffset = len;
          gsap.to(tail, {
            strokeDashoffset: 0,
            scrollTrigger: { trigger: scene, start: "top 60%", end: "top 20%", scrub: true }
          });
        }
      }

      if (artType === "handoff") {
        const path = scene.querySelector(".thread-unspooled");
        if (path) {
          const len = path.getTotalLength();
          path.style.strokeDasharray = len;
          path.style.strokeDashoffset = len;
          gsap.to(path, {
            strokeDashoffset: 0,
            scrollTrigger: { trigger: scene, start: "top 80%", end: "top 30%", scrub: true }
          });
        }
      }
    });
  } else {
    // Fallback: plain IntersectionObserver fades — no scroll-scrubbing magic
    // but every scene appears as it enters view. We mark scenes as
    // .pre-reveal first (so they start at opacity 0), then strip that class
    // on intersection for a soft fade-in.
    scenes.forEach(s => s.classList.add("pre-reveal"));
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.remove("pre-reveal"); });
    }, { threshold: 0.2 });
    scenes.forEach(s => obs.observe(s));
  }
})();

/* ------------------------------------------------------------------ *
 *  WAITLIST FORM                                                     *
 *  Always saves locally. Posts to FORMSPREE_ENDPOINT if set.         *
 *  If a Supabase config exists (window.ARIADNE_CONFIG), inserts into *
 *  the `waitlist` table too.                                         *
 * ------------------------------------------------------------------ */

const FORMSPREE_ENDPOINT = ""; // optional — paste a Formspree URL to enable
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

    // 1. Always store locally as a stub.
    try {
      const list = JSON.parse(localStorage.getItem(WAITLIST_KEY) || "[]");
      list.push({ ...data, at: Date.now() });
      localStorage.setItem(WAITLIST_KEY, JSON.stringify(list));
    } catch {}

    // 2. Optional: post to Formspree.
    if (FORMSPREE_ENDPOINT) {
      try {
        await fetch(FORMSPREE_ENDPOINT, {
          method: "POST",
          headers: { "Accept": "application/json", "Content-Type": "application/json" },
          body: JSON.stringify(data)
        });
      } catch (err) { console.warn("Formspree submit failed:", err); }
    }

    // 3. Optional: insert into Supabase waitlist table.
    const cfg = window.ARIADNE_CONFIG;
    if (cfg && cfg.supabaseUrl && cfg.supabaseAnonKey) {
      try {
        await fetch(`${cfg.supabaseUrl}/rest/v1/waitlist`, {
          method: "POST",
          headers: {
            "apikey": cfg.supabaseAnonKey,
            "Authorization": `Bearer ${cfg.supabaseAnonKey}`,
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
          },
          body: JSON.stringify({
            name: data.name || null,
            email: data.email,
            doing: data.doing || null
          })
        });
      } catch (err) { console.warn("Supabase waitlist insert failed:", err); }
    }

    if (!FORMSPREE_ENDPOINT && !(cfg && cfg.supabaseUrl)) {
      console.info("[Ariadne waitlist — dev mode] saved locally:", data);
    }

    form.hidden = true;
    success.hidden = false;
    success.scrollIntoView({ behavior: "smooth", block: "center" });
  });
})();
