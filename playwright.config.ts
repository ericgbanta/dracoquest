import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  use: {
    baseURL: 'http://localhost:4173/dracoquest/',
    browserName: 'chromium',
    viewport: { width: 375, height: 667 },
    isMobile: true,
    hasTouch: true,
    trace: 'off',
  },
  webServer: {
    command: 'npx vite build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173/dracoquest/',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
