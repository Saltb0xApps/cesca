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

    // Each scene gets a single one-shot reveal as it enters view. No pinning,
    // no scrub — scrolling stays continuous, the page is ~30% shorter, and
    // each scene's details animate in fast (≤ 800ms) once.
    const revealOpts = { start: "top 75%", once: true };

    scenes.forEach((scene) => {
      const art = scene.querySelector(".scene-art");
      const artType = art && art.dataset.art;

      if (artType === "walls") {
        gsap.from(scene.querySelectorAll(".walls-fading line"), {
          opacity: 0,
          duration: 0.5,
          stagger: 0.06,
          scrollTrigger: { trigger: scene, ...revealOpts },
        });
      }

      if (artType === "labyrinth") {
        gsap.from(scene.querySelectorAll(".labyrinth-full rect"), {
          opacity: 0,
          duration: 0.4,
          stagger: 0.08,
          scrollTrigger: { trigger: scene, ...revealOpts },
        });
        gsap.from(scene.querySelectorAll(".passion-words text"), {
          opacity: 0,
          y: 6,
          duration: 0.4,
          stagger: 0.05,
          delay: 0.35,
          scrollTrigger: { trigger: scene, ...revealOpts },
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
            duration: 0.7,
            ease: "power2.out",
            scrollTrigger: { trigger: scene, ...revealOpts },
          });
        }
      }

      if (artType === "ariadne") {
        const skein = scene.querySelector(".skein");
        const tail = scene.querySelector(".skein-tail");
        if (skein) {
          gsap.fromTo(skein, { x: 0 }, {
            x: 40,
            duration: 0.6,
            ease: "power2.out",
            scrollTrigger: { trigger: scene, ...revealOpts },
          });
        }
        if (tail) {
          const len = tail.getTotalLength ? tail.getTotalLength() : 50;
          tail.style.strokeDasharray = len;
          tail.style.strokeDashoffset = len;
          gsap.to(tail, {
            strokeDashoffset: 0,
            duration: 0.6,
            ease: "power2.out",
            scrollTrigger: { trigger: scene, ...revealOpts },
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
            duration: 0.8,
            ease: "power2.out",
            scrollTrigger: { trigger: scene, ...revealOpts },
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
