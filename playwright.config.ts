import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  outputDir: '/tmp/heartbeat-tests',
  fullyParallel: true,
  workers: 2,
  reporter: 'list',
  timeout: 60_000,
  use: { baseURL: 'http://127.0.0.1:4321', viewport: { width: 1440, height: 960 }, trace: 'retain-on-failure' },
  webServer: { command: 'npm run dev -- --host 127.0.0.1 --port 4321', url: 'http://127.0.0.1:4321', reuseExistingServer: true, timeout: 30_000 },
});
