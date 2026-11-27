/**
 * The right stack of the FileMap canvas: the exceptions that need a response now, and how each
 * product stands.
 *
 * WHERE IT COMES FROM. AAP §0.12.4's SCR-12 row fixes the stack's content — "right stack with the
 * four most urgent exceptions and a health card per product" — AAP §0.13.1's tree and §0.15.1's file
 * plan name this path, and the folder's declared contents fix the export: `CanvasRightStack`, "the
 * four most urgent exceptions (the service's ordering, never re-sorted here) and a health card per
 * product".
 *
 * WHAT IT LEAVES TO ITS CALLER — rules P-6 and P-2. The urgency order and the four-row window are the
 * service's, not this component's: the canvas screen asks the port for the scoped rows with the port's
 * own list parameters and hands them down unchanged. Nothing here sorts, slices, filters, counts,
 * totals, averages or subtracts, so a stack of three rows or five is the caller's decision rather than
 * a defect here, and the same payload always renders the same stack. The component reads no service
 * (rule P-2), imports no seed (rule P-2) and holds no state of its own, which is what lets a screen
 * render it from a payload a preview or a test supplies.
 *
 * EVERY NUMBER IT PRINTS ARRIVES COMPUTED — rule P-6. Revenue at risk is the aggregation's own amount,
 * the days to impact and the age are the row's own readings, and a product's figures arrive already
 * derived and already formatted by their owner. This module appends no unit to a value, recomputes
 * nothing and types no amount, identifier, date or count; the only arithmetic it could perform — a
 * window of four, a total, a difference between two dates — belongs to the service that produced the
 * payload, so it does not appear.
 *
 * EVERY FIGURE OPENS ITS EVIDENCE — rule P-6, principle PR-6. The revenue figure is wrapped in
 * `EvidenceRef` on the row's own identifier, which is the reference the port resolves for an exception
 * record, and each product figure carries the reference the payload supplied for it. A product figure
 * without a reference cannot be constructed: `evidenceRef` is a required member of
 * {@link ProductHealthFigure}, so a health card cannot show a number that has nowhere to open.
 *
 * THE LABELS ARE THE PAYLOAD'S, NEVER THIS FILE'S — rule P-1. A product figure arrives with its exact
 * specification §5.3 string typed as `SimLabel`, and it is painted beside the figure by the status
 * primitive; the exception card's computed readings carry the one `Simulated calculation` member of
 * `SIM_LABELS`, imported rather than spelled, because that fixed wording has exactly one owner in the
 * codebase. This module therefore writes no `Simulated …` string of its own, strips none of the
 * labels it is handed and re-cases none of them.
 *
 * THE PRODUCT-HEALTH PAYLOAD HAS NO DECLARED TYPE, AND THIS FILE DOES NOT INVENT ONE. `src/types`
 * declares no product-health shape and the port (`src/services/site-intelligence-service.ts`) declares
 * no read that returns one: the canvas's own reads are `getTopology` and `getCanvasRibbon`, and
 * neither carries a per-product card. Rather than add a competing shared type or a domain shape this
 * run cannot trace to an input, {@link ProductHealthRow} is the display shape this component consumes:
 * the product's own identifier and name from the record, an optional state expressed in the shared
 * status vocabulary, and the figures with the caption, reference and label that their owners supply.
 * The screen that builds the rows from the service's payloads owns every decision behind them; when a
 * product-health read is declared, its payload is what fills this shape and no member here changes.
 *
 * FRESHNESS GOES THROUGH THE SHARED VOCABULARY — rule B-3, AAP §0.5.2. A row's freshness is a
 * `Freshness` record, so its source is printed from `SOURCE_LABELS` — the shared vocabulary of the six
 * sources, never a spelling of this file's — and its state reaches the status primitive through
 * {@link freshnessMeaning}, the one mapping `src/components/freshness-pill.tsx` exports, so the pill
 * keeps that reading as its single owner and no second copy of it exists here. The record's as-of
 * instant is shown beside them in the mono face, so a stale reading states when its source last
 * answered rather than leaving the reader to open the drawer for it.
 *
 * WHAT IT DOES NOT CLAIM AND DOES NOT REACH — rules B-1, B-2, P-4, P-5, P-7. No sentence states a
 * property of a deployment, a store or a copy: the stack reports records and nothing more. No
 * competitor reading can appear — every value here is a first-party or computed record field, and the
 * component has no member through which a market-intelligence figure could be blended with one. Every
 * name on screen is a field of a seeded record, so no company, plant, product or person is written
 * here, and the workspace is the FileMap canvas the product names. Nothing is fetched, no
 * configuration is read and no credential exists in the file.
 *
 * KEYBOARD, SEMANTICS AND THEMES — rule B-3. Each group is a real `<ul>` of `<li>` items so four rows
 * announce as four items, and each row acts through `ActionButton`, the application's only button: a
 * native `button`, a 24x24 px minimum target, the 2 px focus ring of the token layer, and a visible
 * label completed by a visually hidden suffix that names the record the control acts on, so a screen
 * reader user hears which exception a row's control opens (WCAG 2.2 SC 2.5.3 and SC 2.4.4). Every row
 * control acts — none is rendered disabled, so none needs a disabled reason (rule P-8). No animation,
 * transition or motion-bearing class appears, and every colour is a role token of
 * `src/theme/tokens.css`, so Command and Paper each supply the pairing the specification measured.
 */
import { Fragment } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { useNavigate } from 'react-router';

import { SIM_LABELS, SOURCE_LABELS } from '../../types';
import type {
  ExceptionId,
  ExceptionRow,
  ExceptionStatus,
  ProductId,
  Severity,
  SimLabel,
} from '../../types';
import { Card } from '../../components/card';
import { EvidenceRef } from '../../components/evidence-drawer';
import { freshnessMeaning } from '../../components/freshness-pill';
import { MonoValue, formatHours } from '../../components/mono-value';
import type { MonoValueKind } from '../../components/mono-value';
import { Panel } from '../../components/panel';
import { StatusIndicator } from '../../components/status-indicator';
import type { StatusMeaning } from '../../components/status-indicator';
import { ActionButton } from '../../components/tooltip';

/* ---------------------------------------------------------------------------------------------
 * The wording, in the one place it is written
 * ------------------------------------------------------------------------------------------- */

/**
 * Every string this module states, held here so the wording has one owner: the components below
 * render these, and the suite names them through this object rather than retyping them.
 *
 * None of these is a fixed specification string. The seven §5.3 labels belong to the figures that
 * carry them and are read from `SIM_LABELS` (rule P-1); an exception's own title, severity, status and
 * source, a product's name and every caption a figure carries arrive with the payload and are never
 * paraphrased here (rule P-6). Nothing below carries an amount, an instant or a record identifier, and
 * nothing states a property of a deployment or a capability the demonstration does not implement
 * (rule P-4). The captions name the field beneath them, which is why they can be owned here.
 */
export const CANVAS_RIGHT_STACK_TEXT = {
  /** The caption of the group holding the urgent exceptions, and the name of its region. */
  urgentCaption: 'Most urgent exceptions',

  /** Shown instead of the list when the caller supplies no urgent row for the current selection. */
  urgentEmpty: 'No open exception falls in the current selection.',

  /** The row control's visible label. */
  openLabel: 'Open',

  /**
   * What follows the visible label in the control's accessible name, before the record's own title.
   *
   * The visible word comes first, so the name still contains what the reader sees (WCAG 2.2 SC 2.5.3)
   * and then says which record the control acts on, which is what distinguishes four controls reading
   * "Open" from one another (SC 2.4.4). The colon carries the separation rather than a surrounding
   * space, because the accessible-name computation drops the leading whitespace of a trailing element
   * and would otherwise run the label into the title as "OpenSupplier …".
   */
  openNameJoiner: ': ',

  /** The caption of the group holding the product health cards, and the name of its region. */
  healthCaption: 'Product health',

  /** Shown instead of the cards when the caller supplies no product for the current selection. */
  healthEmpty: 'No product falls in the current selection.',

  /** Shown inside a product card whose caller supplied no figure for it to display. */
  healthFigureEmpty: 'No figure for this product is available in the current selection.',

  /** The caption of the row holding a product's own state. */
  stateCaption: 'State',

  /** The caption of the row holding the exception's identifier. */
  identifierCaption: 'Identifier',

  /** The caption of the row holding the revenue the exception places at risk. */
  revenueCaption: 'Revenue at risk',

  /** The caption of the row holding the exception's days to impact. */
  daysToImpactCaption: 'Days to impact',

  /** The caption of the row holding how long the exception has been open, in hours. */
  ageCaption: 'Age (hours)',

  /** The caption of the row holding the exception's severity. */
  severityCaption: 'Severity',

  /** The caption of the row holding the exception's own status. */
  statusCaption: 'Status',

  /** The caption of the row holding the freshness of the sources the row was read from. */
  freshnessCaption: 'Source freshness',
} as const;

/**
 * The label a computed reading carries, read from the fixed vocabulary rather than spelled here.
 *
 * `SIM_LABELS[1]` is `Simulated calculation`, the exact specification §5.3 member that
 * `src/types/primitives.ts` owns; typing it as `(typeof SIM_LABELS)[1]` keeps the literal, so a
 * reworded fixed string reaches this module instead of leaving it asserting yesterday's text
 * (rule P-1).
 */
const CALCULATED_LABEL: (typeof SIM_LABELS)[1] = SIM_LABELS[1];

/* ---------------------------------------------------------------------------------------------
 * The two vocabularies read as status meanings
 * ------------------------------------------------------------------------------------------- */

/**
 * How one severity level reads in the shared status vocabulary, and the only place one is chosen.
 *
 * No input fixes this mapping, so it is a reading rather than a quotation: the level that needs a
 * response today reads as a failure, the level beneath it as a warning, the level beneath that as
 * something a reader should look at, and the lowest level as a neutral state rather than as a pass,
 * because "not urgent" is not the same as "verified good". A queue that shows the same four levels takes
 * the same reading from this mapping's sibling rather than from a second idea of what a level means;
 * the copies exist because a feature folder may not import another one (AAP §0.13.2), and a shared
 * helper in the status vocabulary's own module would replace them.
 *
 * The label printed beside the icon is always the record's own spelling, so the meaning never replaces
 * what the record says, and the icon, the label and the colour always travel together (rule B-3). The
 * map is exhaustive by type, so a fifth level added to `Severity` fails to compile rather than
 * rendering as whichever arm happened to be there.
 */
const SEVERITY_MEANINGS = {
  critical: 'fail',
  high: 'warning',
  medium: 'review',
  low: 'empty',
} as const satisfies Record<Severity, StatusMeaning>;

/**
 * How one exception status reads in the shared status vocabulary, and the only place one is chosen.
 *
 * An open exception is something still to act on and so a warning, a resolved one is a pass, and a
 * dismissed one is neutral — it left the queue without being resolved, which is neither an achievement
 * nor a failure. No input fixes the mapping; the label beside the icon is the record's own spelling and
 * the map is exhaustive by type, so a fourth status fails to compile rather than falling back to a
 * meaning nobody decided.
 */
const EXCEPTION_STATUS_MEANINGS = {
  open: 'warning',
  resolved: 'pass',
  dismissed: 'empty',
} as const satisfies Record<ExceptionStatus, StatusMeaning>;

/*
 * Freshness is the one reading this file does not hold. `freshnessMeaning`, imported above from
 * `src/components/freshness-pill.tsx`, is the single mapping from a source's state onto the shared
 * status vocabulary — `fresh` as a pass, `stale` and `partial` as warnings, `unavailable` as a
 * failure — so this stack consumes the pill's own function rather than a copy of it. The pill keeps
 * that reading as its single owner (AAP §0.5.2: one indicator, no second union), a change to it
 * therefore reaches this stack instead of leaving the old meaning behind, and the `switch` behind it
 * is exhaustive over `FreshnessState`, so a fifth state is decided there before it can appear here.
 */

/* ---------------------------------------------------------------------------------------------
 * The class lists, built from role tokens only
 * ------------------------------------------------------------------------------------------- */

/**
 * The stack itself: the two groups one 4 px step apart, in a column that never forces the canvas
 * column beside it wider than the grid gives it.
 */
const STACK_CLASSES = 'flex min-w-0 flex-col gap-4';

/** One group's rows, one 4 px step further apart than the fields inside a row. */
const LIST_CLASSES = 'flex min-w-0 flex-col gap-3';

/** The fields of one card, each caption above its value. */
const FIELD_LIST_CLASSES = 'flex min-w-0 flex-col gap-2';

/** One caption-and-value pair, wrapping rather than overflowing in the stack's narrow column. */
const FIELD_ROW_CLASSES = 'flex min-w-0 flex-wrap items-baseline justify-between gap-2';

/**
 * The caption of a field: the caption text role, whose contrast on both surfaces is the ratio the
 * specification's token tables measured, at the smallest step of the type scale.
 */
const CAPTION_CLASSES = 'min-w-0 text-12 text-text-caption';

/** The cell holding a field's value, in the primary text role. */
const VALUE_CELL_CLASSES = 'flex min-w-0 flex-wrap items-center gap-2 text-13 text-text-primary';

/** The step a figure's own value takes, so the number is the loudest thing in its row. */
const FIGURE_VALUE_CLASSES = 'min-w-0 break-words text-16 text-text-primary';

/** The step a figure's label takes: the same size as the caption beside it. */
const FIGURE_LABEL_CLASSES = 'text-13';

/** The cell holding a figure's value and its label, stacked one 4 px step apart. */
const FIGURE_CELL_CLASSES = 'flex min-w-0 flex-col gap-1';

/** One card's body inside its panel: the fields, then the label the figures carry. */
const CARD_BODY_CLASSES = 'flex min-w-0 flex-col gap-2';

/** The sentence shown instead of a group's rows when the group has none. */
const EMPTY_CLASSES = 'text-13 text-text-caption';

/**
 * A product's name inside its card's heading, and the identifier beside it in the secondary text role.
 *
 * The name is the prominent half where the record states one — it is what the plant calls the product —
 * and the identifier follows it in the mono face so it aligns with every other identifier on the canvas.
 * Both come from the record, so neither is written here, and the name is rendered only where it says
 * something the identifier does not (see {@link ProductHealthCard}).
 */
const TITLE_NAME_CLASSES = 'break-words';
const TITLE_ID_CLASSES = 'text-text-secondary';

/* ---------------------------------------------------------------------------------------------
 * The props this stack consumes
 * ------------------------------------------------------------------------------------------- */

/**
 * One state expressed in the shared status vocabulary: the meaning that selects the icon and the
 * status colour, and the label printed beside it.
 *
 * The pair is exactly what `StatusIndicator` requires, so a caller states a state the same way the
 * primitive renders it, and a colour can never arrive without the icon and the label that carry its
 * meaning (rule B-3).
 */
export interface ProductHealthStatus {
  /** The meaning the state reads as. */
  readonly meaning: StatusMeaning;

  /** The label shown beside the icon: the record's own wording, never a phrase of this file's. */
  readonly label: string;
}

/**
 * One figure of a product health card, with everything the component needs to show it honestly.
 *
 * The four required members are the rule set's four duties for a number on the canvas: a caption that
 * says what it is, the value exactly as its owner computed it (rule P-6), the reference that opens its
 * evidence (rule P-6, PR-6), and the exact specification §5.3 label it carries (rule P-1). `kind` is
 * omitted for a plain count, which has no formatting rule of its own, and supplied for an amount, an
 * identifier, a timestamp or a hash so `MonoValue` applies the one presentation rule that fits.
 */
export interface ProductHealthFigure {
  /** What the figure is, as the payload names it. */
  readonly label: string;

  /** The value exactly as the service or the aggregation produced it: never rounded, scaled or unit-appended here. */
  readonly value: number | string;

  /** Which of `MonoValue`'s four rules applies; absent for a plain count. */
  readonly kind?: MonoValueKind;

  /** The reference `getEvidence` resolves for this figure, required so the value can open its evidence. */
  readonly evidenceRef: string;

  /** The exact specification §5.3 label this figure carries, typed so a paraphrase cannot compile. */
  readonly simLabel: SimLabel;
}

/**
 * One product's health card, in the display shape this component consumes.
 *
 * Reported gap: no product-health payload is declared in `src/types` or on the port, so these members
 * are the component's own display contract rather than a shared domain type (see the module note). The
 * screen builds a row per product from the records and aggregates it already holds: the product's own
 * identifier and name, the state in the shared status vocabulary when the payload states one, and the
 * figures with their captions, references and labels.
 */
export interface ProductHealthRow {
  /** The product's identifier from the record, rendered in the mono face. */
  readonly productId: ProductId;

  /**
   * The product's name from the record, where the record states one of its own.
   *
   * The port declares no product-name read, so a caller building a row from the exception rows hands
   * the record's identifier in this member as well as in `productId`, and the heading prints that one
   * spelling once (see {@link ProductHealthCard}).
   */
  readonly productName: string;

  /**
   * The product's state, when the caller has one to state.
   *
   * Absent, no state row is rendered: no member of this shape is filled by default, and an empty status
   * row would be a caption with nothing under it.
   */
  readonly status?: ProductHealthStatus;

  /** The figures the card shows, in the order the caller supplies them. */
  readonly figures: readonly ProductHealthFigure[];
}

/** Props of {@link CanvasRightStack}. */
export interface CanvasRightStackProps {
  /**
   * The urgent exceptions, exactly as the service ordered and limited them.
   *
   * Required. The rows are rendered in this order and in this count — the stack never sorts, slices or
   * recounts them — because the urgency order and the four-row window are the port's (rule P-6). An
   * empty array renders the group's empty sentence rather than a blank region.
   */
  readonly urgentExceptions: readonly ExceptionRow[];

  /**
   * One row per product, in the order the caller supplies them.
   *
   * Required for the same reason: an empty array is a real answer — no product in the current
   * selection — and it renders the group's empty sentence.
   */
  readonly productHealth: readonly ProductHealthRow[];

  /**
   * What selecting an urgent row does, when the screen keeps one shared selection.
   *
   * Omitted, the row's control navigates to the exception's own detail route instead, so the control
   * always acts and never needs a disabled explanation (rule P-8). The identifier passed is always the
   * record's own, never a literal of this file's.
   */
  readonly onSelectException?: (exceptionId: ExceptionId) => void;
}

/* ---------------------------------------------------------------------------------------------
 * The pieces one row is built from
 * ------------------------------------------------------------------------------------------- */

/**
 * The route an exception's own detail page answers on.
 *
 * AAP §0.12.4 fixes the shape `/exceptions/:exceptionId`, and the identifier that completes it is the
 * record's own. The path is a route this module navigates to, not a record value, so it is written
 * once here rather than repeated at the call site.
 */
const EXCEPTIONS_PATH = '/exceptions';

/** Props of the caption-and-value pair every field of a card renders. */
interface FieldProps {
  /** The caption naming the field, always supplied by this module's own wording object. */
  readonly caption: string;

  /** The field's value: a figure as it arrived, a formatted value, or a status. */
  readonly children: ReactNode;
}

/**
 * One field of a card: its caption and its value.
 *
 * The pair is a `<dt>` and a `<dd>` inside the card's `<dl>`, wrapped in the `<div>` those two elements
 * are grouped by, which is the shape the HTML content model gives a description list whose terms and
 * descriptions are laid out in rows. A screen reader then announces a caption and the value beneath it
 * as one term and one description rather than as two unrelated lines, whatever the value happens to be.
 */
function Field({ caption, children }: FieldProps): ReactElement {
  return (
    <div className={FIELD_ROW_CLASSES}>
      <dt className={CAPTION_CLASSES}>{caption}</dt>
      <dd className={VALUE_CELL_CLASSES}>{children}</dd>
    </div>
  );
}

/** Props of {@link UrgentExceptionCard}. */
interface UrgentExceptionCardProps {
  /** The row exactly as the service returned it. Read, never re-ordered or altered. */
  readonly exception: ExceptionRow;

  /** What the row's control does when it is activated. */
  readonly onActivate: (exceptionId: ExceptionId) => void;
}

/**
 * One urgent exception: the record's own title with the readings a planner triages it by.
 *
 * The card is an `<article>` because it is one self-contained item of a list of like items, and its
 * heading is the record's own title, so the stack's rows are announced by what happened rather than by
 * an identifier. Every value beneath it is a field of the row or a record value formatted by its owner:
 * the identifier in the mono face, the revenue at risk behind the trigger that opens the exception's
 * own evidence, the days to impact as the record states them, the age presented as whole hours by
 * `src/components/mono-value.tsx` rather than as the exact fraction the aggregate measured, and the
 * three statuses the shared vocabulary renders with an icon, a label and a colour together (rule B-3).
 *
 * The row's control sits in the card's actions slot and always acts — it selects the exception when the
 * screen keeps a selection and opens the exception's own page otherwise — so no control here is
 * rendered disabled and none needs an explanation (rule P-8). Its accessible name is the visible word
 * plus the record's title, so four controls reading "Open" are still told apart by a screen reader
 * (WCAG 2.2 SC 2.4.4), and its visible text starts that name (SC 2.5.3).
 */
function UrgentExceptionCard({ exception, onActivate }: UrgentExceptionCardProps): ReactElement {
  return (
    <Card
      as="article"
      title={exception.title}
      actions={
        <ActionButton
          onClick={() => {
            onActivate(exception.id);
          }}
        >
          {CANVAS_RIGHT_STACK_TEXT.openLabel}
          <span className="sr-only">{`${CANVAS_RIGHT_STACK_TEXT.openNameJoiner}${exception.title}`}</span>
        </ActionButton>
      }
    >
      <Panel as="div">
        <div className={CARD_BODY_CLASSES}>
          <dl className={FIELD_LIST_CLASSES}>
            <Field caption={CANVAS_RIGHT_STACK_TEXT.identifierCaption}>
              <MonoValue value={exception.id} kind="id" />
            </Field>
            <Field caption={CANVAS_RIGHT_STACK_TEXT.revenueCaption}>
              <EvidenceRef ref={exception.id}>
                <MonoValue value={exception.revenueAtRiskEur} kind="money" />
              </EvidenceRef>
            </Field>
            <Field caption={CANVAS_RIGHT_STACK_TEXT.daysToImpactCaption}>
              {exception.daysToImpact}
            </Field>
            <Field caption={CANVAS_RIGHT_STACK_TEXT.ageCaption}>
              {formatHours(exception.ageHours)}
            </Field>
            <Field caption={CANVAS_RIGHT_STACK_TEXT.severityCaption}>
              <StatusIndicator
                meaning={SEVERITY_MEANINGS[exception.severity]}
                label={exception.severity}
              />
            </Field>
            <Field caption={CANVAS_RIGHT_STACK_TEXT.statusCaption}>
              <StatusIndicator
                meaning={EXCEPTION_STATUS_MEANINGS[exception.status]}
                label={exception.status}
              />
            </Field>
            <Field caption={CANVAS_RIGHT_STACK_TEXT.freshnessCaption}>
              <StatusIndicator
                meaning={freshnessMeaning(exception.freshness.state)}
                label={SOURCE_LABELS[exception.freshness.source]}
              />
              <span className={CAPTION_CLASSES}>{exception.freshness.state}</span>
              <MonoValue
                value={exception.freshness.asOf}
                kind="timestamp"
                className={CAPTION_CLASSES}
              />
            </Field>
          </dl>
          {/* The card's computed readings carry the one fixed label, read from its owner rather than
              spelled here (rule P-1). */}
          <StatusIndicator
            meaning="simulated"
            label={CALCULATED_LABEL}
            className={FIGURE_LABEL_CLASSES}
          />
        </div>
      </Panel>
    </Card>
  );
}

/** Props of {@link ProductHealthCard}. */
interface ProductHealthCardProps {
  /** The product's row, in the display shape this component consumes. */
  readonly product: ProductHealthRow;
}

/**
 * How one product stands: the identifier it is known by, its name where the record states one, its
 * state when the payload states one, and each figure behind the trigger that opens its evidence.
 *
 * The heading prints the identifier in the mono face and, beside it, the name in the primary text role —
 * but only where the name is a second fact about the product. The port declares no product-name read, so
 * the screen that builds these rows hands the record's identifier in both members (see the row's own
 * note), and a heading that printed both would show one identifier twice and read as two values. Nothing
 * is shortened, re-cased or invented here: the record's own spelling stands once. Each figure renders
 * its caption above its value, because a caption and a value on one line would push the value out of the
 * stack's narrow column; the value is exactly what arrived, and the payload's own `SimLabel` is painted
 * beneath it, so a figure labels itself rather than relying on the badge elsewhere on the route (rule
 * P-1). The state row is rendered only when the caller states one, and a card with no figure says so
 * instead of showing an empty list.
 */
function ProductHealthCard({ product }: ProductHealthCardProps): ReactElement {
  /** Whether the name adds a fact the identifier does not already state. */
  const statesItsOwnName =
    product.productName.trim() !== '' && product.productName !== product.productId;

  return (
    <Card
      as="article"
      title={
        <>
          {statesItsOwnName ? (
            <>
              <span className={TITLE_NAME_CLASSES}>{product.productName}</span>{' '}
            </>
          ) : null}
          <MonoValue value={product.productId} kind="id" className={TITLE_ID_CLASSES} />
        </>
      }
    >
      <Panel as="div">
        <div className={CARD_BODY_CLASSES}>
          <dl className={FIELD_LIST_CLASSES}>
            {product.status === undefined ? null : (
              <Field caption={CANVAS_RIGHT_STACK_TEXT.stateCaption}>
                <StatusIndicator meaning={product.status.meaning} label={product.status.label} />
              </Field>
            )}
            {product.figures.map((figure) => (
              <Fragment key={`${figure.evidenceRef}:${figure.label}`}>
                <dt className={CAPTION_CLASSES}>{figure.label}</dt>
                <dd className={FIGURE_CELL_CLASSES}>
                  <span className={FIGURE_VALUE_CLASSES}>
                    <EvidenceRef ref={figure.evidenceRef}>
                      {figure.kind === undefined ? (
                        figure.value
                      ) : (
                        <MonoValue value={figure.value} kind={figure.kind} />
                      )}
                    </EvidenceRef>
                  </span>
                  <StatusIndicator
                    meaning="simulated"
                    label={figure.simLabel}
                    className={FIGURE_LABEL_CLASSES}
                  />
                </dd>
              </Fragment>
            ))}
          </dl>
          {product.figures.length === 0 ? (
            <p className={EMPTY_CLASSES}>{CANVAS_RIGHT_STACK_TEXT.healthFigureEmpty}</p>
          ) : null}
        </div>
      </Panel>
    </Card>
  );
}

/**
 * The FileMap canvas's right stack: the urgent exceptions on top, one health card per product beneath
 * them.
 *
 * The component is presentational by design (rules P-2, P-6): the canvas screen owns the scope, the
 * service reads and the selection, and passes the rows and an optional selection callback down. It is
 * also the one place the two groups are named, so the stack announces itself as two regions rather
 * than as one undifferentiated column of cards, and each group is a real list so four rows announce as
 * four items (rule B-3).
 *
 * A row's control calls `onSelectException` with the record's own identifier when the screen keeps a
 * shared selection, and otherwise navigates to that exception's detail route; either way the control
 * performs its function, so nothing here is dead and nothing needs a disabled explanation (rule P-8).
 *
 * @param props The urgent rows in the service's order, the product rows in the caller's order, and the
 *   optional selection callback. See {@link CanvasRightStackProps}.
 * @returns The two named groups of the stack.
 */
export function CanvasRightStack({
  urgentExceptions,
  productHealth,
  onSelectException,
}: CanvasRightStackProps): ReactElement {
  const navigate = useNavigate();

  /* The preference is the screen's and the fallback is this component's: a screen that keeps one
     selection passes the callback so the canvas and the stack stay in step, and a screen that does not
     still gets a working control rather than an inert one. */
  const activate = (exceptionId: ExceptionId): void => {
    if (onSelectException === undefined) {
      void navigate(`${EXCEPTIONS_PATH}/${exceptionId}`);
      return;
    }

    onSelectException(exceptionId);
  };

  return (
    <div className={STACK_CLASSES}>
      <Panel label={CANVAS_RIGHT_STACK_TEXT.urgentCaption}>
        {urgentExceptions.length === 0 ? (
          <p className={EMPTY_CLASSES}>{CANVAS_RIGHT_STACK_TEXT.urgentEmpty}</p>
        ) : (
          <ul className={LIST_CLASSES}>
            {urgentExceptions.map((exception) => (
              <li key={exception.id}>
                <UrgentExceptionCard exception={exception} onActivate={activate} />
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <Panel label={CANVAS_RIGHT_STACK_TEXT.healthCaption}>
        {productHealth.length === 0 ? (
          <p className={EMPTY_CLASSES}>{CANVAS_RIGHT_STACK_TEXT.healthEmpty}</p>
        ) : (
          <ul className={LIST_CLASSES}>
            {productHealth.map((product) => (
              <li key={product.productId}>
                <ProductHealthCard product={product} />
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

