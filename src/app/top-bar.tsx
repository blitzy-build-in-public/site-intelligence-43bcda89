/**
 * The Site Intelligence shell's top bar: the banner landmark every route carries above the router
 * outlet, holding the product's identity and, in the specification's own order, the demonstration badge
 * and the controls the specification places in it.
 *
 * WHAT THIS FILE IS. `src/app/app.tsx` renders `TopBar` once, above the router outlet, so every route
 * — the overview, the exception queue, the investigation, the scenario comparison, the approvals
 * inbox, the audit trail, the assistant, the sovereignty screens, the FileMap canvas, the competitive
 * atlas, the stage-notice pages and the not-found page — carries the same identity and reaches the
 * same controls. Functional requirement F1 and AAP §0.12.1 are this file: "Wordmark with 'by Gracious
 * Intelligence' beneath it, scope filters, identifier search, six freshness pills, sovereignty pill,
 * simulated-data badge with the demo clock, theme switch, density switch, role switcher — in that
 * order."
 *
 * THE ORDER IS WRITTEN ONCE, AS A LIST. Those nine positions are siblings inside the row below, each
 * numbered by a comment, so the rendered order and the specification's sentence can be compared line
 * by line. Nothing here sorts, groups or reorders by viewport width: the row wraps, so a narrow window
 * shows the same sequence in the same order, fewer items to a line.
 *
 * WHY THE BADGE ARRIVES AS A SLOT. `src/components/simulated-data-badge.tsx` is mounted exactly once in
 * the application, by the shell, and the specification fixes its position inside this bar. Both facts
 * cannot hold if this component imported it: a mount here as well would put two badges on every route,
 * while rule P-1 wants one, present, in position. `src/app/app.tsx` therefore builds the element — with
 * the `Simulated data` label and the callback that opens the simulation popover, which is how the
 * demonstration's clock reaches the reader — and this file places it at position six and nowhere else.
 * This file imports no badge and renders no second one.
 *
 * THE POPOVER SITS WHERE IT WAS OPENED. `SimulationControls` is the popover the badge opens. It renders
 * nothing while the shell store's `simulationOpen` is false, and when it does open, its panel is
 * positioned against its own root rather than laid out inside the row, so position seven costs one
 * element and no movement of the bar.
 *
 * WHAT THIS FILE DOES NOT DO, AND WHY.
 * - It reads no data. Each child performs its own read through `useService()` and the query cache
 *   (rule P-2), so the bar holds no service import, no `useEffect`, no `fetch` and no state of its own:
 *   one child whose read fails cannot take the product's identity off the screen with it.
 * - It adds no control and fakes none. Every entry in the row is a component that either does its own
 *   work or says in its own words why it cannot (rule P-8); nothing here wraps a child in a disabled
 *   state it could not explain, and there is no dead button, link or field in the bar.
 * - It invents no label for a simulated figure or control (rule P-1). The badge's label is the shell's,
 *   the popover carries its own `Simulated control` label, the sovereignty pill carries its own, and
 *   the seven fixed §5.3 strings belong to the surfaces that carry them.
 * - It types no figure, amount, date, count or record identifier (rule P-6): the wordmark is the only
 *   text it writes, and the clock the badge shows is `DEMO_CLOCK`, supplied by the shell.
 * - It claims nothing about the product. The two lines of the wordmark name the product and the company
 *   and stop there, so nothing in the bar states or implies sovereignty, copy prevention, tamper
 *   resistance or a certification (rule P-4).
 *
 * LANDMARK AND KEYBOARD (rule B-3). The root is a `<header>`, so it is the page's banner landmark, and
 * it holds exactly one row. The children are in DOM order, which is the order the tab key follows, and
 * the row declares no `tabIndex`, no `role` and no key handler of its own, so it neither adds a stop nor
 * traps focus. Every control inside is one of the children's own native controls, each drawing the 2 px
 * focus ring from the focus-ring role. `flex-wrap` together with `min-w-0` is what keeps the bar inside
 * a 390 px viewport: nothing in the row has a fixed pixel width, so at a narrow window and at 200 % zoom
 * the items wrap onto further lines instead of overflowing sideways.
 *
 * HOW MANY LINES THE ROW USES IS ITS CONTENTS' DECISION, NOT THIS FILE'S. The specification fixes both
 * the order of the nine positions and the single wrapping row, so this file invents no breakpoint and
 * wraps no child in a disclosure of its own. What decides where a line ends is each child's own
 * intrinsic width: the six freshness pills want roughly a full line to themselves on a desktop
 * viewport, and the role switcher's labelled select and its non-authorisation note are wide on their
 * own. The row therefore takes the lines its content needs — measured at four on a 1440 px window and
 * eight at 390 px, with no horizontal overflow at either — and reads left to right, top to bottom, in
 * exactly the order above.
 *
 * TWO CHILDREN FOLD THEIR OWN WIDEST CONTENT BELOW `md`, AND THAT IS THEIRS TO DO. At a phone viewport
 * the bar's height is what every route's content pays for, and the six pills took two lines of it while
 * the labelled select took another: the header measured 584 px above a 328 px navigation in an 812 px
 * viewport, which left the route's own heading below the fold (QA finding qa-w013-I35). So
 * `FreshnessStrip` holds its pills behind one disclosure and `RoleSwitcher` holds its label and its
 * select behind another, both below Tailwind's `md` breakpoint, each trigger owned by the component
 * whose content it reveals (AAP §0.5.2) and each standing in the position its content occupies, so the
 * order AAP §0.12.1 fixes is unchanged. This file still has no breakpoint of its own and still renders
 * no trigger and no wrapped child: from `md` up both children render exactly what they rendered before,
 * and the row's order, wrapping and tokens are as they were.
 *
 * ROLE TOKENS ONLY (rules B-3, B-1, B-2). Every colour, size and radius below is a role token, so both
 * themes resolve the contrast the specification's tables already measured, and no raw palette value,
 * shadow or opacity is reachable from this file — the token layer exposes no shadow utility at all
 * (specification §4.3). The wordmark is two lines of text rather than a logo image, because rule B-1
 * permits no fetched asset and the design system bundles no logo mark. Nothing here reads configuration
 * and no host or port is written anywhere in it (rule B-2).
 *
 * Rules served: B-1, B-2, B-3, P-1, P-2, P-4, P-6, P-7 and P-8. Rules P-3 and P-5 are served by
 * children of the row rather than by this file: the role switcher states its own demonstration note and
 * its non-authorisation warning, and no market-intelligence element appears in the top bar at all.
 */
import type { ReactElement, ReactNode } from 'react';

import { DensitySwitch } from '../theme/density-switch';
import { ThemeSwitch } from '../theme/theme-switch';
import { FreshnessStrip } from './freshness-strip';
import { RoleSwitcher } from './role-switcher';
import { ScopeFilters } from './scope-filters';
import { SearchField } from './search-field';
import { SimulationControls } from './simulation-controls';
import { SovereigntyPill } from './sovereignty-pill';

/* ---------------------------------------------------------------------------------------------
 * The wording, in the one place it is written
 * ------------------------------------------------------------------------------------------- */

/**
 * The two lines of the wordmark, held here so the product's naming has one owner in this file.
 *
 * Both are the names rule P-7 fixes — "Site Intelligence" for the product and "by Gracious
 * Intelligence" for the company, spelled exactly as the rule spells them — and neither is a
 * specification §5.3 simulation label, a figure, an identifier or a claim (rules P-1, P-4, P-6). They
 * are a `const` object rather than text inline in the JSX so a suite can name them instead of retyping
 * them, the way `SCOPE_FILTERS_TEXT`, `FRESHNESS_STRIP_TEXT` and `ROLE_SWITCHER_TEXT` own their own
 * copy.
 */
export const TOP_BAR_TEXT = {
  /** The product's name, as rule P-7 fixes it. */
  productName: 'Site Intelligence',

  /** The company line beneath it, as rule P-7 fixes it, lower case because it reads as a continuation. */
  company: 'by Gracious Intelligence',
} as const;

/* ---------------------------------------------------------------------------------------------
 * The layout, built from role tokens only
 * ------------------------------------------------------------------------------------------- */

/**
 * The landmark itself: the page's banner on the ground surface, closed by the decorative hairline in its
 * per-theme role so the bar is separated from the page without an elevation — the token layer has no
 * shadow utility to select (specification §4.3).
 *
 * `w-full min-w-0` is what makes the wrapping row below work: the header takes the width it is given and
 * may be narrower than its content's preferred width, which is the condition under which `flex-wrap`
 * ever breaks a line. No pixel width is fixed here, so the bar follows the viewport at 390 px and at
 * 200 % zoom alike.
 */
const HEADER_CLASSES = 'w-full min-w-0 border-b border-hairline bg-ground text-text-primary';

/**
 * The single row: a wrapping flex line on the 4 px grid, 12 px between items and 8 px between lines
 * when it wraps, with one step of padding on each side so a control's focus ring is never clipped by
 * the hairline.
 *
 * `items-center` aligns the wordmark, the pickers, the pills, the badge and the switches — which are
 * different heights — on one optical line. Nothing is justified or auto-margined: the bar's contents are
 * dense enough that they use every line they are given, and an auto margin on any one of them would
 * strand the spare width of a line as a gap while pushing later items onto a further line. Packed from
 * the inline-start, the row is as short as its contents allow and every line reads left to right in the
 * order the specification fixes.
 */
const ROW_CLASSES = 'flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2';

/**
 * The wordmark's block: the two lines stacked, and `min-w-0` so a narrow window shortens it rather than
 * pushing the row sideways.
 */
const WORDMARK_CLASSES = 'flex min-w-0 flex-col';

/** The product's name: the 16 px step of the specification §4.3 scale, in the primary text role. */
const WORDMARK_NAME_CLASSES = 'text-16 font-semibold text-text-primary';

/** The company line beneath it: the 12 px step in the secondary text role, so it reads as a caption. */
const WORDMARK_COMPANY_CLASSES = 'text-12 text-text-secondary';

/* ---------------------------------------------------------------------------------------------
 * The wordmark
 * ------------------------------------------------------------------------------------------- */

/**
 * The wordmark: the product's name with the company's line beneath it, as text.
 *
 * It is a `<p>` rather than a heading deliberately. The product's name is not a section of the page, and
 * each screen's own level-one heading is `PageHeader`'s — so a heading here would give every route a
 * second top-level heading and a document outline that says the whole application sits inside the
 * product's name (rule B-3).
 *
 * The two lines are `<span>`s inside the flex column above rather than a block element each, so the name
 * and the company line are announced as one short text run — the same pair the wordmark shows.
 *
 * @returns The product's name with the company line beneath it.
 */
function Wordmark(): ReactElement {
  return (
    <p className={WORDMARK_CLASSES}>
      <span className={WORDMARK_NAME_CLASSES}>{TOP_BAR_TEXT.productName}</span>
      <span className={WORDMARK_COMPANY_CLASSES}>{TOP_BAR_TEXT.company}</span>
    </p>
  );
}

/* ---------------------------------------------------------------------------------------------
 * The bar
 * ------------------------------------------------------------------------------------------- */

/** Props of {@link TopBar}. */
export interface TopBarProps {
  /**
   * The persistent simulated-data badge, created by the shell so rule P-1 has one mounting point.
   *
   * Required, with no default: a default would make this module the badge's owner and would let a
   * second badge exist the moment two components rendered one each. The shell builds the element with
   * its label and its activation callback and hands it here to be placed; this file neither imports
   * `SimulatedDataBadge` nor renders a badge of its own.
   */
  readonly badge: ReactNode;
}

/**
 * The Site Intelligence top bar: one banner landmark holding one wrapping row of nine positions, in
 * the order AAP §0.12.1 fixes.
 *
 * The row is deliberately flat. Each of the nine entries is a direct child of the flex line, in the
 * order the numbered comments give, so the sequence can be audited against the specification without
 * following a tree of groups. A group wrapper would also change the wrapping behaviour — items inside a
 * group would wrap among themselves rather than across the bar — and the order would then depend on the
 * viewport, which is precisely what the specification does not allow.
 *
 * The component reads nothing and holds nothing: it takes the badge, places it among the row's nine
 * positions and returns.
 *
 * @param props - The badge the shell built for position six.
 * @returns The banner landmark with the bar's nine positions inside it.
 */
export function TopBar({ badge }: TopBarProps): ReactElement {
  return (
    <header className={HEADER_CLASSES}>
      <div className={ROW_CLASSES}>
        {/* 1 — the wordmark: the product's name with the company line beneath. */}
        <Wordmark />

        {/* 2 — the plant and product scope filters, controlled by the shell store. */}
        <ScopeFilters />

        {/* 3 — the identifier search that opens a record's own screen or its evidence drawer. */}
        <SearchField />

        {/* 4 — the six source pills, each with its own state and age. */}
        <FreshnessStrip />

        {/* 5 — the declared posture pill, which its own component tags as a simulated control. */}
        <SovereigntyPill />

        {/* 6 — the persistent Simulated data badge with the demonstration clock, built by the shell
               and placed here and nowhere else (rule P-1). */}
        {badge}

        {/* 7 — the simulation popover the badge opens; nothing renders while it is closed. */}
        <SimulationControls />

        {/* 8 — the two presentation switches, the theme first and the row density immediately after. */}
        <ThemeSwitch />
        <DensitySwitch />

        {/* 9 — the demonstration role switcher, last, because switching it changes the session. */}
        <RoleSwitcher />
      </div>
    </header>
  );
}
