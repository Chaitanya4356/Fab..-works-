import { defineConfig } from '@playwright/test'

process.loadEnvFile('.env.local')

export default defineConfig({
  testDir: 'tests/e2e',
  workers: 1,
  fullyParallel: false,
  globalSetup: './tests/e2e/global-setup.ts',
  // A fresh `next dev` compiles each page on its first visit, which can take longer than the default 5 s.
  expect: { timeout: 15_000 },
  use: {
    baseURL: 'http://localhost:3000',
    browserName: 'chromium',
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000/login',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
