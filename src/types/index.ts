/**
 * Shared-type surface of Site Intelligence (AAP 0.13.2): the single barrel through which services,
 * seed, domain, app, components, features and tests reach the vocabulary the inputs fix.
 *
 * This module declares nothing itself. It re-exports the sixteen subject modules of `src/types`
 * with `export *`, which keeps the runtime constants defined beside their types reachable to the
 * consumers that legitimately render them, and turns a name exported twice in the folder into a
 * compile error here rather than at a distant call site.
 */

export * from './primitives';
export * from './figure-text';
export * from './comparison-text';
export * from './routes';
export * from './service';
export * from './entities';
export * from './solver';
export * from './audit';
export * from './packages';
export * from './screen-dto';
export * from './topology';
export * from './atlas';
export * from './plan';
export * from './sources';
export * from './models';
export * from './exit-package';
