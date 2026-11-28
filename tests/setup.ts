/**
 * Vitest setup module that `vite.config.ts` loads through `test.setupFiles` for every suite, the
 * jsdom ones and the `node` ones alike, so nothing here may touch a DOM global at module scope.
 *
 * The matchers are registered through jest-dom's `/vitest` entry, which extends Vitest's own
 * `expect`. `cleanup` is registered by hand because Testing Library auto-registers it only when a
 * global `afterEach` exists, and this project runs Vitest with `globals: false`.
 */
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});
