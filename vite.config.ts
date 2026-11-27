/**
 * The single Vite and Vitest configuration: dev server, production build, preview and the test
 * suite. One file rather than a second `vitest.config.ts`, so the gate's test run and the build can
 * never disagree about transforms.
 *
 * The suite runs under jsdom by default because component tests assert focus, labelling and DOM
 * semantics. A suite that needs Node's own realm — one that hashes through `crypto.subtle`, which
 * rejects jsdom's `ArrayBuffer`, or one that drives a stubbed `fetch` — opts out on its own first
 * line with `// @vitest-environment node`.
 *
 * This file reads no environment variable, defines none and points at no other origin: the
 * application needs no configuration to run, test or build (rules B-1 and B-2).
 */

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  preview: {
    port: 4173,
    strictPort: true,
  },
  build: {
    target: 'es2022',
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
