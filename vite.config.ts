import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The Express backend (server/index.js) serves the JSON API on :3001.
// In dev, Vite serves the React app on :5173 and proxies /api to the backend.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true, // listen on 0.0.0.0 so phones / iPads on the same Wi-Fi can connect
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
});
