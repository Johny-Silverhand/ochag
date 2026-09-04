import path from "node:path";
import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const here = import.meta.dirname;

export default defineConfig({
  root: here,
  plugins: [viteReact(), tailwindcss()],
  base: "./",
  publicDir: false,
  resolve: {
    alias: [
      { find: "@/lib/data/ops", replacement: path.resolve(here, "../src/lib/data/ops.ios.ts") },
      { find: "@", replacement: path.resolve(here, "../src") },
    ],
  },
  build: {
    outDir: path.resolve(here, "Ochag/www"),
    emptyOutDir: true,
    assetsDir: "assets",
  },
});
