/**
 * The route paths the shell and the screens that navigate to them share (AAP 0.13.2).
 *
 * AAP 0.12.4 fixes the exception queue at `/exceptions` (its SCR-02 row): the queue is the decision
 * loop's entry point, so it is the destination the overview's primary action reaches, the way back
 * from every stage-notice route, the link an unknown address offers, the entry the navigation lists,
 * and the base of the three screen paths built beneath it. Three shell modules and four screens write
 * that address, and AAP 0.13.2 requires every route to be declared once, so a copy per module would
 * let a rename leave some of them pointing at an address the router no longer answers — with no
 * compile error and nothing that compares the copies.
 *
 * ONE DECLARATION, ON THE SURFACE BOTH LAYERS REACH. `src/app/router.tsx`'s module contract forbids a
 * screen from importing `src/app`, and the shell may not reach into a screen, so neither the router
 * nor the navigation table can own a value the feature screens need. `src/types` is the folder both
 * layers legitimately import, published by the barrel `./index.ts` to services, app, components,
 * features and tests, so the path is declared here and every consumer imports it — from this module
 * directly, or through the barrel that re-exports it. That includes the router's own child segment,
 * obtained with its `childPathOf` helper, and the search-hit targets the mock adapter builds.
 * `src/app/nav-items.ts` consumes it for the queue's navigation entry, which keeps that table the
 * declaration of the entry's route, screen identifier, stage and disabled state — only the path
 * string itself lives here.
 *
 * The parameterised patterns below this path (`/exceptions/:exceptionId` and its `/scenarios` child)
 * are route declarations, so they stay with the router's table; this module holds the queue address
 * alone.
 */

/** The exception queue's route, SCR-02's address (AAP 0.12.4). */
export const EXCEPTION_QUEUE_PATH = '/exceptions';
