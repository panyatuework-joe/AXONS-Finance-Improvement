import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // Relative base so the built app works when served from a sub-path
  // (e.g. GitHub Pages at /axons-finance-gl/) as well as from a domain root.
  base: './',
  plugins: [react(), tailwindcss()],
  server: {
    port: 4173,
  },
});
