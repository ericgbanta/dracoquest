import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'node:fs';

// Area art (enemies and zone backdrops) is not precached: it is cached the
// first time a zone shows it, so each new area doesn't grow the first
// download. Built files keep the source name before the hash, which is what
// these patterns match.
const readJson = (path: string) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8')) as { id: string }[];
const areaArt = [...readJson('./src/data/enemies.json'), ...readJson('./src/data/zones.json')].map((x) => `**/${x.id}-*.webp`);

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
        globIgnores: areaArt,
        runtimeCaching: [{
          urlPattern: /\/assets\/[^/]+\.webp$/,
          handler: 'CacheFirst',
          options: { cacheName: 'dracoquest-area-art', expiration: { maxEntries: 400 } },
        }],
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
