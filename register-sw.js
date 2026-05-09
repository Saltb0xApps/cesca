/* Registers the service worker and shows a small "install Ariadne" banner
   once the browser fires `beforeinstallprompt`. Safe to load on every page. */

(() => {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/service-worker.js")
        .catch((err) => console.warn("SW registration failed:", err));
    });
  }

  let deferredPrompt = null;

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallBanner();
  });

  function showInstallBanner() {
    if (document.getElementById("install-banner")) return;
    if (localStorage.getItem("ariadne:install-dismissed") === "1") return;

    const banner = document.createElement("div");
    banner.id = "install-banner";
    banner.className = "install-banner";
    banner.innerHTML = `
      <p><strong>Install Ariadne</strong> on your phone — keep the thread close.</p>
      <button class="btn primary" id="install-yes">Install</button>
      <button class="close" id="install-no" aria-label="Dismiss">×</button>
    `;
    document.body.appendChild(banner);

    document.getElementById("install-yes").addEventListener("click", async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      try { await deferredPrompt.userChoice; } catch {}
      deferredPrompt = null;
      banner.remove();
    });
    document.getElementById("install-no").addEventListener("click", () => {
      localStorage.setItem("ariadne:install-dismissed", "1");
      banner.remove();
    });
  }
})();
