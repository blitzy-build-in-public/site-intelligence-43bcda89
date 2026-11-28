/** SCR-02's route: AAP 0.12.4 fixes `/exceptions`, declared in `src/types` because the router at
 * `src/app/router.tsx` forbids a screen importing it and the shell may not reach a screen. */

/** The exception queue's route, SCR-02's address (AAP 0.12.4). */
export const EXCEPTION_QUEUE_PATH = '/exceptions';
