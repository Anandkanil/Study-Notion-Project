import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Kept compatible with the old Create React App setup so no Netlify settings change:
// same `npm run build`, same `build/` output folder, same REACT_APP_* variable names.
export default defineConfig({
  plugins: [react()],
  envPrefix: ["VITE_", "REACT_APP_"],
  server: { port: 3000 },
  preview: { port: 3000 },
  build: {
    outDir: "build",
    sourcemap: false,
    rollupOptions: {
      output: {
        // Split big libraries into their own cached files
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          redux: ["@reduxjs/toolkit", "react-redux"],
        },
      },
    },
  },
});
