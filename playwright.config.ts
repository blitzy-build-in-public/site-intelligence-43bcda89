import { defineConfig, devices } from '@playwright/test';

/**
 * The browser suite's configuration: the built application served by one preview server, one
 * Chromium build, and two projects that partition the specs so each one runs exactly once.
 *
 * The suite runs against `vite preview`, which serves only `dist/`, so a browser test sees the
 * artefact `npm run build` emits and the sole origin it may contact is the preview server's own
 * (rules B-1 and B-2). That origin is an IPv4 literal in a loopback secure context, which is what
 * lets the audit chain's `crypto.subtle` calls run in the browser.
 *
 * The port is derived per checkout because many checkouts share this host: `CLONE_INDEX` selects
 * 20000 + index * 10, `PREVIEW_PORT` overrides outright, and with neither set the documented 4173
 * is used. `--strictPort` together with `reuseExistingServer: false` turns a port already in use
 * into a failure, so a stale server can never answer for the code under test.
 */

/**
 * The environment of the Playwright process, resolved through `globalThis` because the project
 * declares no Node types. Only the preview port is read from it, so no other setting varies
 * between runs.
 */
const env: Record<string, string | undefined> =
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};

/**
 * One whole number from the environment, or `fallback` when the variable is unset or empty. A value
 * outside `min`..`max` throws while the configuration loads: the alternative is a `webServer.url` of
 * `http://127.0.0.1:NaN`, which spends the whole readiness timeout before saying anything useful.
 */
function integerFrom(name: string, fallback: number, min: number, max: number): number {
  const raw = env[name];
  const value = raw === undefined || raw === '' ? fallback : Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(
      `${name} must be a whole number between ${min} and ${max}, received "${raw ?? String(fallback)}".`,
    );
  }
  return value;
}

/**
 * The clone index is capped at the largest one whose derived port stays valid: 20000 + 4500 * 10
 * is 65000.
 */
const cloneIndex = integerFrom('CLONE_INDEX', 0, 0, 4500);
const previewPort = integerFrom(
  'PREVIEW_PORT',
  cloneIndex === 0 ? 4173 : 20_000 + cloneIndex * 10,
  1,
  65_535,
);
const baseURL = `http://127.0.0.1:${previewPort}`;

/**
 * A desktop size wide enough for the shell's top bar and the canvas's two lenses side by side. Both
 * projects restate it after the device spread, which carries its own 1280x720 viewport.
 */
const viewport = { width: 1440, height: 900 };

export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',
  fullyParallel: true,
  // Two workers rather than one per core: the build host is shared by many checkouts and carries
  // about 1.4 GB of RAM in total.
  workers: 2,
  // A retry would hide the flake that an accessibility, keyboard or labelling failure usually
  // reports, so there is none.
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL,
    // The application registers no service worker, and a request made by one surfaces only on the
    // browser context: blocking them is what keeps the request-origin assertion meaningful.
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    viewport,
  },
  webServer: {
    command: `npm run preview -- --port ${previewPort} --strictPort`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport },
      testIgnore: /planner-journey\.spec\.ts/,
    },
    {
      name: 'journeys',
      use: { ...devices['Desktop Chrome'], viewport },
      testMatch: /planner-journey\.spec\.ts/,
    },
  ],
});
