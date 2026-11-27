/**
 * The application's single React root.
 *
 * `./styles/index.css` reaches the browser only from here: it is the bundle's one global stylesheet,
 * carrying Tailwind's utilities, the reset, the reduced-motion block and both bundled `@font-face`
 * declarations, so the typefaces are served from the application's own origin and never fetched
 * (AAP 0.13.2 "Styling", rule B-1).
 */
import { createRoot } from 'react-dom/client';

import { App } from './app/app';

import './styles/index.css';

const mountNode = document.getElementById('root');

if (mountNode === null) {
  throw new Error('The document must provide the #root element this application mounts into.');
}

/**
 * This module is the single React root, and `<App/>` is the single composition root: the providers,
 * the shell and the router outlet are composed in `src/app/app.tsx` and nowhere else, so no part of
 * that composition is decided here (AAP 0.13.2).
 */
createRoot(mountNode).render(<App />);
