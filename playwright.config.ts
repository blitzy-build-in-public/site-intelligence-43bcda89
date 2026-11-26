import { defineConfig, devices } from '@playwright/test';

/**
 * Port resolution keeps several checkouts on this host off one another's ports.
 * `CLONE_INDEX` is the index each agent is given for its own clone; `PREVIEW_PORT`
 * overrides it outright. Clone index 0 (and no override) uses the documented 4173.
 */
const env: Record<string, string | undefined> =
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};

const cloneIndex = Number(env['CLONE_INDEX'] ?? '0');
const previewPort = Number(
  env['PREVIEW_PORT'] ?? (cloneIndex === 0 ? '4173' : String(20000 + cloneIndex * 10)),
);
const baseURL = `http://127.0.0.1:${previewPort}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: Boolean(env['CI']),
  retries: 0,
  workers: 2,
  reporter: [['list']],
  use: {
    baseURL,
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: /planner-journey\.spec\.ts/,
    },
    {
      name: 'journeys',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /planner-journey\.spec\.ts/,
    },
  ],
  webServer: {
    command: `npx vite preview --port ${previewPort} --strictPort`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
