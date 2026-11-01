import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";

/**
 * Golden Report-only static bundle, using the same report renderer, validator,
 * finance ledger, and PDF generator as the main application.
 * No parent app router, landing pages, global navigation, chat bubble,
 * retargeting pixel, or Aetheris navigation is imported.
 */
export default defineConfig({
  plugins: [react()],
  base: "./",
  // The main website has a large public/ library; it is not part of the standalone scanner.
  publicDir: false,
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  build: {
    outDir: "dist-golden-standalone",
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, "./golden-standalone.html"),
    },
  },
});
