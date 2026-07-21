import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./styles/app.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register the service worker (production web only) so the app is installable.
// Skipped inside the Electron desktop build, where the local server is always
// available and cached assets could go stale across app updates.
const isElectron = navigator.userAgent.includes("Electron");
if (import.meta.env.PROD && !isElectron && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
