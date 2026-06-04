import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
// `base` is set via env so we can deploy under /<repo-name>/ on GitHub Pages
// without breaking local dev.
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === "build" ? process.env.VITE_BASE ?? "/" : "/",
}));
