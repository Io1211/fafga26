import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Der Foto- und Video-Editor liegt bewusst außerhalb von frontend/, damit
    // er auch ohne Build läuft. Der Entwicklungsserver muss ihn deshalb
    // ausliefern dürfen — beim Bauen folgt Rollup dem relativen Pfad ohnehin.
    fs: { allow: [".."] },
    proxy: {
      "/api": "http://127.0.0.1:8000",
      "/static": "http://127.0.0.1:8000",
    },
  },
});
