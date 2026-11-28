/**
 * The single Vite and Vitest configuration: dev server, production build, preview and the test
 * suite. One file rather than a second `vitest.config.ts`, so the gate's test run and the build can
 * never disagree about transforms.
 *
 * The suite runs under jsdom by default because component tests assert focus, labelling and DOM
 * semantics. A suite that needs a platform digest rather than a DOM — one that hashes through
 * `crypto.subtle`, or one that drives a stubbed `fetch` — declares that environment itself, on
 * its own first line, with `// @vitest-environment node`: jsdom 31 exposes no `crypto.subtle` of
 * its own, so the digest resolves to the platform's implementation, and the declaration keeps that
 * requirement with the module that has it rather than leaving it to this default.
 *
 * This file reads no environment variable, defines none and points at no other origin: the
 * application needs no configuration to run, test or build (rules B-1 and B-2).
 */

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // No `preview` block, so the port belongs to whoever starts the server: the browser suite passes
  // the per-checkout port it derives (see playwright.config.ts), and a bare `npm run preview` takes
  // Vite's own 4173 default. Writing the port here would state it twice and make a second
  // checkout's preview fail on a port another checkout already holds.
  build: {
    target: 'es2022',
    /**
     * Three kinds of code, three kinds of chunk.
     *
     * The route modules are already separate: `src/app/router.tsx` reaches every screen through a dynamic
     * `import()`, so a screen and whatever only it needs are fetched when its address is first matched.
     * The two groups below split the rest by how often it changes and by whether the shell needs it at
     * all: `vendor` holds the frameworks the shell itself runs on, which change only when a dependency is
     * upgraded, and `seed-records` holds the demonstration's dataset, which changes only when a record
     * changes. Neither is affected by an edit to a screen, so a deploy invalidates the chunk it touched
     * instead of the whole bundle.
     *
     * `d3-geo` and `topojson-client` are deliberately left out of `vendor`. They are the map lens's alone —
     * they project the bundled Natural Earth boundaries and nothing else imports them — so grouping them
     * here would make every route download the projection engine and put them back into the initial
     * payload this split exists to keep route-scoped. Left out, they ride in the canvas route's own chunk,
     * which is the only place they are used. `@phosphor-icons/react` is left out of `vendor` for its own
     * reason: it is not framework code but icon modules the shell and the screens import, so it stays on
     * the entry chunk's own graph — which every route loads regardless, because the shell draws its own
     * icons before any screen arrives — and the set is tree-shaken to the icons the modules import.
     */
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'vendor',
              test: /[\\/]node_modules[\\/](?!d3-geo[\\/]|topojson-client[\\/]|@phosphor-icons[\\/])/u,
            },
            { name: 'seed-records', test: /[\\/]src[\\/]seed[\\/]/u },
          ],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./tests/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.ts'],
    exclude: [
      'node_modules/**',
      'dist/**',
      'e2e/**',
      'test-results/**',
      'playwright-report/**',
    ],
    // Each case starts with no spy inherited from the one before it, so a suite that stubs a global
    // for a single assertion cannot see a stale call list in the case after it.
    restoreMocks: true,
    // Two workers rather than one per core: the build host is shared by many checkouts and carries
    // about 1.4 GB of RAM in total.
    maxWorkers: 2,
  },
});
