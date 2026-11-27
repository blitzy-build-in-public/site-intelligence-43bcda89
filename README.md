# site-intelligence-43bcda89
Created by Blitzy

## Packages

Every package is pinned to an exact version: `package.json` carries no range, no wildcard, no `latest`, no tag and no pre-release. `package-lock.json` is committed, and `npm ci` installs exactly that lockfile and fails if the manifest and the lockfile disagree. The manifest declares 25 packages - 9 under `dependencies` and 16 under `devDependencies` - being the 21 packages the runtime and development lists name plus four `@types` packages admitted because a named package cannot work without them. `npm ls --depth=0` reports no missing, invalid or unsatisfied peer dependency.

| Package | Version | Declared under | Purpose |
|---|---|---|---|
| `@phosphor-icons/react` | 2.1.10 | dependencies | icons for status, provenance and shell affordances |
| `@tanstack/react-query` | 5.108.4 | dependencies | query cache keyed by method and arguments, invalidated after every write |
| `d3-geo` | 3.1.2 | dependencies | geographic projections and path generation for the bundled Natural Earth boundaries |
| `react` | 19.3.1 | dependencies | the view layer |
| `react-dom` | 19.3.1 | dependencies | DOM renderer matched to React exactly |
| `react-router` | 8.5.3 | dependencies | route table, nested routes, the not-found page and the stage-notice routes |
| `tailwindcss` | 4.3.5 | dependencies | design tokens and the utility layer, declared as a runtime dependency because the product specification's allowed runtime package list names it, although it is consumed at build time |
| `topojson-client` | 3.1.0 | dependencies | TopoJSON to GeoJSON conversion for the map lens |
| `zustand` | 5.1.0 | dependencies | theme, density, active role, scope filters and selection state |
| `@axe-core/playwright` | 4.14.1 | devDependencies | accessibility checks with the four WCAG tags in the browser tests |
| `@playwright/test` | 1.65.1 | devDependencies | browser journeys, the request-origin test and the axe runs |
| `@tailwindcss/vite` | 4.3.5 | devDependencies | Tailwind's Vite integration, chosen over a PostCSS config (reason below) |
| `@testing-library/dom` | 10.4.2 | devDependencies | non-optional peer of `@testing-library/react` 16, installed explicitly (reason below) |
| `@testing-library/jest-dom` | 8.0.0 | devDependencies | DOM matchers for the component tests |
| `@testing-library/react` | 16.3.3 | devDependencies | renders and queries components through the service binding |
| `@testing-library/user-event` | 14.6.13 | devDependencies | keyboard and pointer interaction in the component tests |
| `@types/d3-geo` | 3.1.1 | devDependencies | type declarations for `d3-geo` (reason below) |
| `@types/react` | 19.3.3 | devDependencies | type declarations for React (reason below) |
| `@types/react-dom` | 19.3.0 | devDependencies | type declarations for `react-dom` (reason below) |
| `@types/topojson-client` | 3.1.5 | devDependencies | type declarations for `topojson-client` (reason below) |
| `@vitejs/plugin-react` | 6.3.0 | devDependencies | the React transform for Vite 8, whose peer range is `vite ^8.0.0` |
| `jsdom` | 31.0.1 | devDependencies | the component-test DOM environment |
| `typescript` | 7.0.2 | devDependencies | strict type checking and the `typecheck` script |
| `vite` | 8.3.8 | devDependencies | dev server and production build |
| `vitest` | 5.1.2 | devDependencies | the unit, component and source-check runner |

### Packages declared beyond the runtime and development lists

- `@types/react` and `@types/react-dom`. React and react-dom publish no type declarations of their own; `react-router`, `@tanstack/react-query` and `@testing-library/react` declare them as peers; and the project compiles JSX with the `react-jsx` transform. Without them `tsc --noEmit` fails with TS7016 on 'react' and 'react/jsx-runtime' and TS7026 on every JSX element. They are type-only, erased at build time, add nothing to the runtime bundle, make no request to any host and hold no secret.
- `@types/d3-geo` and `@types/topojson-client`. `d3-geo` and `topojson-client` publish no type declarations, and the map lens and the competitive atlas type their geometry through them. They are type-only, with the same properties as the React declarations above.
- `@testing-library/dom`. A non-optional peer of `@testing-library/react` 16.3.3, so it is declared explicitly in the manifest rather than left to peer resolution.
- `@tailwindcss/vite`. Preferred over the alternative of a `postcss.config.js` carrying `@tailwindcss/postcss`, because one Vite plugin replaces a second config file and its plugin chain.

Every one of these additions was checked for needing no network at runtime and holding no secret, and each exact version exists in its registry and satisfies every peer in the pinned set.
