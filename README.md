# Site Intelligence

by Gracious Intelligence

Site Intelligence is a customer-controlled decision workspace for manufacturers with several plants, and its visual workspace is the FileMap canvas. This repository is a self-contained, browser-only demonstration of that product on synthetic data: a planner sees a supply disruption, sees what it touches, compares response options with their arithmetic, approves one, watches a simulated write-back and reads the audit record. Nothing leaves the browser — there is no backend, no database, no model, no sign-in and no connector.

## Run

Prerequisites are Node 26 — the active long-term-support major, recorded in `.nvmrc` and enforced by the `engines` field and by `engine-strict=true` in `.npmrc` — and npm. An install under any other major fails rather than warns.

```bash
npm ci
npm run dev
```

`npm ci` installs exactly the committed `package-lock.json`, and fails if the manifest and the lockfile disagree. `npm run dev` serves the application in development on its own port; `npm run preview` serves a built bundle instead, and needs `npm run build` first.

The application needs no configuration, no server and no credentials: there is no `.env` file, no service address, no model endpoint and no identity provider to point at.

The root path resolves to the active persona's entry route, so the demonstration opens where that persona works:

| Persona | Role | Entry route |
|---|---|---|
| USR-01 material planner | `material-planner` | `/canvas` |
| USR-02 plant manager | `plant-manager` | `/approvals` |
| USR-03 head of supply chain | `head-of-supply-chain` | `/canvas` |
| USR-04 platform administrator | `platform-administrator` | `/admin/sovereignty` |
| USR-05 production planner | `production-planner` | `/canvas` |
| USR-06 auditor | `auditor` | `/audit` |
| USR-07 supplier quality engineer | `supplier-quality-engineer` | `/canvas` |
| USR-08 external supplier engineer | `external-supplier-engineer` | `/evidence` |

Switching persona moves the session to that persona's entry route. `/evidence` renders a stage-notice page in this run, because the evidence workspace arrives in stage S4.

The browser tests additionally need a Chromium build, installed once and out of band:

```bash
npx playwright install chromium
```

## Test

`npm test` runs Vitest once over the unit suites, the component suites and the source checks. Component suites render in the jsdom environment; the arithmetic suites — the solver, the audit chain, the policy engine and the aggregations — declare the Node environment, because the chain hashes through the platform digest.

`npm run test:e2e` runs the Playwright browser suites on Chromium. The configuration starts the preview server itself (`npm run preview -- --port <port> --strictPort`; the port is 4173 unless the checkout's `CLONE_INDEX` or `PREVIEW_PORT` selects another) and waits for it to answer, so `npm run build` has to run first: with no `dist/` the readiness probe never sees a document and the run fails.

`npm run typecheck` runs the type check on its own (`tsc --noEmit` over `src`, `tests`, `e2e` and both configuration files, under `strict` with `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride` and `verbatimModuleSyntax`).

`npm run check` is the single gate. It chains `typecheck`, `test`, `build` and `test:e2e` with `&&`, so it stops at the first failure, and one full run is budgeted at ten minutes on a standard CI machine.

Every automated test title begins with its specification identifier, so a single test runs by name:

```bash
npx vitest run -t "T-17"
npx playwright test -g "T-07"
```

Delivered in this run: T-01 to T-21, and T-25. Not delivered: T-22, T-23 and T-24, which belong to stage S4, and T-26, which belongs to stage S5. Those four are absent rather than pending, skipped or passing.

The source checks run inside `npm test` and enforce the boundaries this documentation describes: no seed import outside the in-browser backend, no typed figure in a component or screen, no `any` in the service and type layers, no credential and no environment read, none of the barred product and vendor vocabulary, and every heading this file is required to carry. Two further scans run over the built bundle during `npm run test:e2e`, so what is actually served is covered as well as the source.

Accessibility is a test rather than a claim: axe-core runs through `@axe-core/playwright` on every route in both themes with the `wcag2a`, `wcag2aa`, `wcag21aa` and `wcag22aa` tags, and the suite fails on any serious or critical violation. The suite targets WCAG 2.2 level AA in both themes: every interactive element is reachable and operable from the keyboard with a visible focus ring, targets measure at least 24x24 px, no meaning is carried by colour alone, every chart, map and graph offers its data as a table, and a reader who prefers reduced motion gets no animated arcs, halos or pulses.

## Build

`npm run build` runs the type check and then the production build (`tsc --noEmit && vite build`), emitting a static bundle in `dist/`. The type check runs inside the build as well as on its own, so a bundle is never emitted from code that fails to type-check.

The bundle is static: any static host serves it, and there is no server-side component to deploy. Every font, icon and map boundary is compiled into it, so the built output requests nothing from a third-party host.

A clean install needs the committed lockfile — `npm ci` installs exactly `package-lock.json`, and `npm ls` reports no missing, invalid or unsatisfied peer dependency.

## The role switcher

The role switcher is the last control in the top bar, in `src/app/role-switcher.tsx`. It selects one of the eight synthetic personas, and the session then acts as that persona: permissions, plant scope and entry route follow it, and the query cache is invalidated so no screen keeps the previous persona's rows.

Its visible label is `Demo role switcher (simulation only)`, and the note beside it reads:

> Browser-side permission checks are not production authorisation.

That note is the point of the control. The permission matrix and the policy engine are evaluated in the browser, by the in-browser backend, over seeded records. A browser-side check demonstrates the mechanism and no more: it is not production authorisation, it grants nothing, and bypassing the control — or calling the service directly from a console — changes nothing about what the backend answers, because the backend evaluates the same matrix itself. Production authorisation is a deployment's to supply, and it is listed among what a real deployment adds below.

## The simulation controls

Every state a screen can be in comes from one popover, `src/app/simulation-controls.tsx`, labelled `Simulated control`. It holds exactly:

- the seven screen states: loading, empty, stale, partial, offline, forbidden and conflict;
- the tampered audit event, which edits the recorded result of `AUD-000142` without recomputing its hash, so "Verify chain" reports the break at sequence 142 and repairs nothing;
- the empty queue, which leaves the exception queue with no rows to match;
- `Reset demo data`, which puts the session back to the seeded baseline.

Every trigger goes through the service interface (`setSimulation` and `resetDemo`), so it changes what the backend answers rather than which branch a component takes. No query parameter, no global and no flag changes behaviour: this popover and the role switcher are the product's only demonstration levers, and the tests drive them the way a reader does.

Every button and link in the application either acts or is visibly disabled with the text that explains why. The navigation keeps the entries of the stages this run does not build, disabled, with the specification's exact tooltips: `Arrives in stage S4` for the evidence workspace and the suppliers entries, and `Arrives in stage S5` for the production plan, the data sources and the models. A route reached by address still explains itself, because each of those paths renders a stage-notice page carrying the same sentence rather than a page that does not exist. Two further controls are disabled with their own text: the scenario comparison screen's custom-constraints control carries `Custom constraints arrive with the optimisation service in the pilot`, and the graph lens's part-opening control carries `Arrives in stage S4`.

## How the mock backend maps to the API client

There is one typed interface and two implementations of it.

- The interface is `SiteIntelligenceService`, in `src/services/site-intelligence-service.ts`. Screens and components reach data only through it, and it is the only shared vocabulary between a screen and a backend.
- `MockBackend`, in `src/services/mock/mock-backend.ts`, is the implementation bound in this run. It holds the seeded records in memory, waits 150-400 ms per call so a loading state is observable, enforces the permission matrix and the policy rules, redacts messages before they cross the boundary (a role without the document permission never receives a confidential body, and an external supplier engineer sees only its own vendor's pins), appends to the audit chain, builds the three exports and carries the demonstration controls.
- `ApiClient`, in `src/services/api-client/`, implements the same interface against the documented HTTP paths under `/api/v1`, held in `src/services/api-client/paths.ts`. It is never called at runtime in this run: it exists so that pointing the application at a real service is a compile-time fact rather than a promise.

`src/services/create-service.ts` is the whole of the change between them. It constructs one adapter and hands out that instance, so binding the other is a one-line edit and no screen, component, feature or shell module moves with it.

Two interface members have no server counterpart. `setSimulation` and `resetDemo` exist for the demonstration, and the API client resolves both as documented no-ops, because a real deployment has neither simulation flags nor a demo reset.

Both adapters produce the same three downloads: the evidence pack and the scenario comparison in stage S1, the chokepoint brief in stage S3. Each JSON carries `"simulated": true` at its top level and the comparison is CSV, and the composition of those files lives in `src/services/exports/` — one module per download — which both adapters call, so the bytes a reader downloads cannot change because the application was bound to the other adapter. That folder is not one of the plan's file paths: the plan names the downloads beside the demonstration adapter alone. The plan's Exports entry names `src/services/mock/exports/{evidence-pack,chokepoint-brief,scenario-csv}.ts`, and those stay the demonstration adapter's own assemblers: they read the session's state and hand the shared builder its inputs. The API client would otherwise have to import the mock adapter's folder to produce the same file, which is the one dependency direction the plan keeps out of it. Each module in the shared folder imports the shared types and nothing else.

Screens and components never import seed data. `src/seed/` is imported by one module, `src/services/mock/seed-loader.ts`, and a source check fails the suite on any other import of it, so a reader can rely on every figure having arrived through the interface.

Every number on a screen is computed: by the solver in `src/domain/solver/` for an option's measures, or by the aggregations in `src/domain/aggregation/` from seed records by the rules the contracts fix. No number is typed into a component, a text template or a test hook, and a source check fails the suite when one appears in `src/features` or `src/components`. The expected results that gate the solver — the six rows of the expected-results table and the expected aggregates — are held in `tests/fixtures/` as test fixtures only: they are never displayed, never seeded onto a screen and never imported from `src/`.

## What is simulated

Everything the application displays is synthetic. There is no backend, no database, no model, no sign-in and no connector, and the application makes no request to any host other than its own: the fonts, the icons and the map boundaries are bundled in this repository, and a browser test fails on any foreign-origin request.

- The assistant answers from a script. Its questions arrive with the seeded records, and each answer's numbers are computed at call time by the solver and the aggregations and filled into the sentence, so no figure is written into the answer text.
- The six data sources — ERP, MES, Scheduling, PLM and QMS, Transport, and the market pack — are freshness records. Nothing is read from a customer system.
- The four models are placeholders in the record set. No model is called, and the assistant's model selector chooses between a labelled in-boundary entry and an external entry that the policy rules block whenever the context carries confidential material.
- Market intelligence is synthetic. The competitive atlas is a simulated market-intelligence pack: every competitor element carries `Simulated market intelligence`, every competitor name carries the tag `Synthetic company`, and no number anywhere blends a first-party value with a market-intelligence value — the series are drawn and labelled apart, and no aggregate sums across the two.
- The audit chain is a browser-side mechanism. It computes a real SHA-256 chain over the seeded events and every action taken, and "Verify chain" recomputes it in the page, which demonstrates the linkage and reports where a break falls. It is labelled `Simulated control`, and it goes no further than that: a page served to a reader cannot establish that a stored record has gone unaltered, and nothing on screen says otherwise.
- Every deployment and control posture is declared configuration, labelled `Declared, not verified`. The top bar's sovereignty pill states the declared position and is tagged `Simulated control`; the sovereignty screen shows, for each row, the status "Declared", the record behind it and the date it was last declared; the outbound endpoints are listed with counts computed from audit events over a thirty-day window. The application does not establish sovereignty, prevent copying or resist tampering, and nothing on screen claims that it does.

No screen presents a synthetic outcome as a real production result. The `Simulated data` badge is mounted once in the shell, above the router outlet, so it renders on every route — the not-found page and the stage-notice pages included — and no screen can omit it. It carries the demonstration clock `2026-12-03T08:00:00+01:00` and opens the simulation controls.

The seven labels are fixed text from the specification, reproduced here exactly as they are rendered:

| Label | Carried by |
|---|---|
| `Simulated data` | The badge on every route, and the seeded scenarios of the exceptions that have no solver case, where their measures appear |
| `Simulated calculation` | Every computed figure: the overview tiles, the risk-by-plant bars, the daily opened-and-resolved chart, revenue at risk per exception, the projected-stock chart, the comparison matrix's numeric rows, the canvas dock and its six ribbon tiles, and the post-approval outcome card |
| `Simulated recommendation` | The recommended option's badge, the rule it states and its trade-off sentence |
| `Simulated write-back` | The write-back preview on the comparison screen, each step in the post-approval tracker, each write-back row on the approval detail, and the message beside a simulated write-back that failed |
| `Simulated control` | The sovereignty pill, the audit chain and its verification result, the tamper trigger, the simulation popover, and the browser-side permission checks behind the role switcher; stage S4 adds the watermarked preview, which this run does not build |
| `Simulated market intelligence` | Every competitor network, series, chokepoint row, overlay and halo, and the atlas legend entries for the competitor series |
| `Declared, not verified` | Every row of the sovereignty screen and the deployment summary above them |

Three companion strings are fixed in the same way: `Simulated company` on every competitor name in a legend, selector or table header; `Simulated data: client self-assessment` on the client's own radar series; and the atlas banner `Simulated market intelligence pack v2026.11. No first-party record is used in any competitor figure.`

## What a real deployment must supply

The demonstration maps a product; it is not a delivery. A deployment adds:

- a real implementation of `SiteIntelligenceService` behind the existing `ApiClient`, so the same interface is served by a real backend without a screen changing;
- real connectors for the six data sources, replacing freshness records with readings;
- identity and authorisation in place of the role switcher, so who may act is decided by the deployment rather than by a control in the page;
- an EU processing boundary and a real in-boundary model behind the assistant, in place of the scripted answers and the placeholder model records;
- a customer-controlled secure document viewer in place of the watermarked preview that stage S4 demonstrates;
- an append-only store the deployment controls behind the audit chain, in place of a chain recomputed in the page.

None of these is present in this repository, and nothing here claims otherwise.

## Licences for bundled map data and fonts

Every font, icon and map file this application uses is committed to this repository and compiled into the built output. None is fetched at build, test or runtime, and each ships with its licence beside it.

| Asset | Files | Licence |
|---|---|---|
| Urbanist | `src/assets/fonts/urbanist-400.woff2`, `src/assets/fonts/urbanist-500.woff2`, `src/assets/fonts/urbanist-600.woff2`, with `src/assets/fonts/LICENSE-Urbanist.txt` | SIL Open Font License 1.1 |
| Geist Mono | `src/assets/fonts/geist-mono-500.woff2`, with `src/assets/fonts/LICENSE-GeistMono.txt` | SIL Open Font License 1.1 |
| Country boundaries | `src/assets/geo/countries-110m.json`, with `src/assets/geo/LICENSE-NaturalEarth.txt` | Natural Earth 1:110m admin-0 boundaries, public domain, no credit required |
| Icons | `@phosphor-icons/react`, imported as components and compiled into the JavaScript bundle | MIT |

The boundary file is the `world-atlas` 2.x distribution of Natural Earth 1:110m data, committed unchanged as TopoJSON and imported as a module so it compiles into the bundle; the data is public domain and that packaging is ISC-licensed. Both typefaces are bundled under the SIL Open Font License 1.1, which permits bundling and redistribution provided the copyright and licence notice travel with the files — which is what the two licence texts beside them are for.

## Packages

Every package is pinned to an exact version: `package.json` carries no range, no wildcard, no `latest`, no tag and no pre-release. `package-lock.json` is committed, and `npm ci` installs exactly that lockfile and fails if the manifest and the lockfile disagree. The manifest declares 25 packages — 9 under `dependencies` and 16 under `devDependencies` — being the 21 packages the specification's allowed runtime list and the development list name, plus four `@types` packages admitted because a named package cannot work without them. Every `dependencies` row is named on the specification's allowed runtime list; every `devDependencies` row is a build or test tool. `npm ls --depth=0` reports no missing, invalid or unsatisfied peer dependency.

| Package | Version | Declared under | Purpose |
|---|---|---|---|
| `@phosphor-icons/react` | 2.1.10 | dependencies | icons for status, provenance and the shell's controls |
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

Six packages sit outside the specification's runtime list and the development list, and each is here for one of two reasons.

- `@types/react` and `@types/react-dom`. React and react-dom publish no type declarations of their own; `react-router`, `@tanstack/react-query` and `@testing-library/react` declare them as peers; and the project compiles JSX with the `react-jsx` transform. Without them `tsc --noEmit` fails with TS7016 on 'react' and 'react/jsx-runtime' and TS7026 on every JSX element. They are type-only, erased at build time, add nothing to the runtime bundle, request nothing from any host and hold no secret.
- `@types/d3-geo` and `@types/topojson-client`. `d3-geo` and `topojson-client` publish no type declarations, and the map lens and the competitive atlas type their geometry through them. They are type-only, with the same properties as the React declarations above.
- `@testing-library/dom`. A non-optional peer of `@testing-library/react` 16.3.3, so it is declared explicitly in the manifest rather than left to peer resolution.
- `@tailwindcss/vite`. Preferred over the alternative of a `postcss.config.js` carrying `@tailwindcss/postcss`, because one Vite plugin replaces a second config file and its plugin chain.

Every addition was checked for needing no network at runtime and holding no secret, and each exact version exists in its registry and satisfies every peer in the pinned set.

`three` is deliberately not installed. The specification lists it for stage S4's 3D part viewer, no screen in this run loads it, and nothing is added that no screen uses.

## Configuration

The application needs no configuration to run, test or build: there is no server address, no model endpoint and no identity provider to point at, so it defines no variable.

| Variable | Default | Purpose |
|---|---|---|
| None for the application | — | No configuration is read by the application, so no variable it uses has a name, a default or a purpose to state. The only variables read anywhere are `CLONE_INDEX` and `PREVIEW_PORT`, by the Playwright configuration, for loopback port selection — `## Test` states their effect. |

Nothing in `src/` reads `import.meta.env` or `process.env`, no `.env` file is committed, and a source check fails the suite on either. The two harness variables never reach the application: they choose the port that the preview server the browser suite starts listens on, and with neither set that port is 4173. Should a later stage introduce a variable for the application, it enters the table above with an empty default and no value in the repository; that is how configuration is documented here, and it is the only way a name may enter the build.
