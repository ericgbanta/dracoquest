import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/dracoquest/',
  plugins: [
    preact(),
    // Offline play: a Workbox service worker precaches the whole app shell.
    // The web manifest is hand-written in public/, so the plugin doesn't generate one.
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      manifest: false,
      workbox: {
        cacheId: 'dracoquest',
        globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2,webmanifest}'],
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html',
      },
    }),
  ],
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
