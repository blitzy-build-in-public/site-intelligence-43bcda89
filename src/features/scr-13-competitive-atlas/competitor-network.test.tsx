/**
 * Component suite for `competitor-network.tsx`, the competitive atlas's network view.
 *
 * Two contracts are asserted here, both of them properties of the drawing rather than of its markup: the
 * type every site and crossing name prints at, resolved from the width the element is actually rendered at
 * rather than stated in the view box's user units; and the leader that ties a crossing's name back to its
 * halo when the placement had to move that name out of the nearest ring, which a name printed beside its
 * halo does not carry.
 *
 * The service is mocked at `service-provider.tsx`, the one boundary `src/components/evidence-drawer.tsx`
 * reads through (rule P-2), so no seed module, adapter or hash chain is involved; no case here opens the
 * drawer, so the mock resolves nothing. Every name is this suite's own plain placeholder: the seed holds the
 * real records, and a component test that borrowed them would assert the payload instead of the drawing
 * (rule P-6). The numbers a crossing's record carries — its overlap, its buffer days — are fixture values the
 * drawing never prints and never computes, and the test constants below state them once for both crossings.
 *
 * Runs under the jsdom environment `vite.config.ts` sets by default; nothing here hashes, reads the clock or
 * touches the network.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type {
  AtlasLane,
  AtlasSite,
  Chokepoint,
  CompetitorNetwork as CompetitorNetworkPayload,
  CompetitorId,
} from '../../types';
import { CompetitorNetwork } from './competitor-network';

/**
 * The port member the drawer reads through, replaced before this module's graph is imported so the real
 * provider — and with it the in-browser adapter and its seeded records — is never reached here (rule P-2).
 */
const getEvidence = vi.hoisted(() => vi.fn());

vi.mock('../../services/service-provider', () => ({
  useService: () => ({ getEvidence }),
}));

/** The competitor the fixture's network belongs to, as contracts §1 spells it. */
const COMPETITOR: CompetitorId = 'CMP-01';

/** The competitor network's own name, which every printed name of its marks is tagged after. */
const NETWORK_NAME = 'Aurelvik Components';

/** The two crossings: one recorded where the client's own sites stand, one recorded on its own. */
const CROSSING_CROWDED = 'CHK-01';
const CROSSING_ALONE = 'CHK-02';

/**
 * Four of the client's own sites, ringing the coordinate the crowded crossing is recorded at.
 *
 * The rings are what the case needs: each site stands about thirty units from that crossing, so its mark
 * and its printed name take every position in the crossing's nearest candidate ring, and the crossing's own
 * name has to step outward. The pack places plants and depots this close together along a coast, and the
 * numbers here are stated as decimal degrees because that is the pair the record type carries.
 */
const CLIENT_SITES: readonly AtlasSite[] = [
  {
    id: 'site-client-east',
    competitorId: null,
    label: 'Client eastern plant',
    latitude: 0,
    longitude: 17.09,
  },
  {
    id: 'site-client-west',
    competitorId: null,
    label: 'Client western plant',
    latitude: 0,
    longitude: -17.09,
  },
  {
    id: 'site-client-north',
    competitorId: null,
    label: 'Client northern plant',
    latitude: 9.82,
    longitude: 0,
  },
  {
    id: 'site-client-south',
    competitorId: null,
    label: 'Client southern plant',
    latitude: -9.61,
    longitude: 0,
  },
];

/** The competitor's two sites, placed apart from both crossings and from the client's own crowd. */
const COMPETITOR_SITES: readonly AtlasSite[] = [
  {
    id: 'site-aurelvik-one',
    competitorId: COMPETITOR,
    label: 'Aurelvik eastern plant',
    latitude: 24,
    longitude: 70,
  },
  {
    id: 'site-aurelvik-two',
    competitorId: COMPETITOR,
    label: 'Aurelvik western plant',
    latitude: -18,
    longitude: 96,
  },
];

/** The competitor's network: its sites, the lane joining them and the class the pack files it under. */
const NETWORKS: readonly CompetitorNetworkPayload[] = [
  {
    competitorId: COMPETITOR,
    label: NETWORK_NAME,
    provenance: 'market_intelligence',
    productClasses: ['class-one'],
    sites: [...COMPETITOR_SITES],
    lanes: [{ fromId: 'site-aurelvik-one', toId: 'site-aurelvik-two', chokepointId: CROSSING_ALONE }],
  },
];

/**
 * The client's own lanes: they join the four plants and, on one of them, traverse the crowded crossing.
 *
 * A lane carries no label, so it takes no room in the placement; it is here so the fixture is a network
 * rather than four unconnected marks, and so the crossing's own record is named by a lane the way the pack
 * names it.
 */
const CLIENT_LANES: readonly AtlasLane[] = [
  { fromId: 'site-client-west', toId: 'site-client-east', chokepointId: CROSSING_CROWDED },
  { fromId: 'site-client-west', toId: 'site-client-north' },
  { fromId: 'site-client-north', toId: 'site-client-east' },
];

/**
 * One crossing, recorded at the coordinate the payload states.
 *
 * `overlap` and `competitorBufferDays` are the members the record type requires and this drawing never
 * reads: the network view prints a crossing's name, its halo and its label, and the shares the record
 * carries are the chokepoint table's subject.
 */
function chokepoint(id: string, label: string, latitude: number, longitude: number): Chokepoint {
  return {
    id,
    label,
    overlap: 67,
    competitorBufferDays: { [COMPETITOR]: 5 },
    contentionNote: 'Two networks contend at this crossing.',
    latitude,
    longitude,
    provenance: 'market_intelligence',
  };
}

/** The two crossings of the fixture: one among the client's own plants, one well away from them. */
const CHOKEPOINTS: readonly Chokepoint[] = [
  chokepoint(CROSSING_CROWDED, 'Crossing at the strait', 0, 0),
  chokepoint(CROSSING_ALONE, 'Crossing at the far cape', 60, -150),
];

/**
 * Renders the network view with the fixture.
 *
 * `onSelectEntity` is a no-op and `selectedEntityId` is `null`: selection is the screen's, and neither case
 * here exercises it, so the drawing is rendered in the state the atlas opens on.
 */
function renderNetwork(): void {
  render(
    <CompetitorNetwork
      clientSites={CLIENT_SITES}
      networks={NETWORKS}
      lanes={CLIENT_LANES}
      chokepoints={CHOKEPOINTS}
      selectedEntityId={null}
      onSelectEntity={() => undefined}
    />,
  );
}

/** The drawing itself, found by the group name it announces. */
function drawing(): SVGSVGElement {
  const element = screen.getByRole('group', { name: /networks and the client network/u });

  if (!(element instanceof SVGSVGElement)) {
    throw new Error('the network view rendered no svg');
  }

  return element;
}

/** The width of the drawing's own view box, in user units, read back from the rendered element. */
function viewBoxWidthOf(): number {
  const box = (drawing().getAttribute('viewBox') ?? '')
    .trim()
    .split(/\s+/u)
    .map(Number);
  const width = box[2];

  if (width === undefined || !(width > 0)) {
    throw new Error('the network view rendered no view-box width');
  }

  return width;
}

/**
 * States the box a browser would have measured for the drawing, before the render whose effect reads it.
 *
 * `src/components/chart-readout.tsx`'s `useChartScale` measures the element once on mount, so a case states
 * the rendered width here and the drawing resolves the type step it prints at from it. jsdom computes no
 * layout, which is why the drawing otherwise keeps its own base geometry.
 *
 * @param renderedWidth The width the element would have been rendered at, in CSS pixels.
 */
function stateRenderedWidth(renderedWidth: number): void {
  vi.spyOn(SVGSVGElement.prototype, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: renderedWidth,
    bottom: renderedWidth,
    width: renderedWidth,
    height: renderedWidth,
    toJSON: () => ({}),
  });
}

/** The run a printed name ends with: the text node after any `<title>` the name carries. */
function runOf(text: Element): string {
  return (text.lastChild?.textContent ?? '').trim();
}

/** The mark of one site or crossing, found by the entity identifier its own group carries. */
function markFor(entityId: string): Element {
  const mark = drawing().querySelector(`[data-mark-entity="${entityId}"]`);

  if (mark === null) {
    throw new Error(`the drawing rendered no mark for ${entityId}`);
  }

  return mark;
}

/** The name one mark printed, or a failure naming the mark rather than a silent null. */
function nameOf(mark: Element): Element {
  const name = mark.querySelector('text');

  if (name === null) {
    throw new Error('the mark printed no name');
  }

  return name;
}

/** One point of the drawing's own grid. */
interface GridPoint {
  readonly x: number;
  readonly y: number;
}

/** The dashed halo one crossing's mark draws: its centre and its radius, read back from the element itself. */
function haloOf(mark: Element): { readonly centre: GridPoint; readonly radius: number } {
  const halo = mark.querySelector('circle[stroke-dasharray]');

  if (halo === null) {
    throw new Error('the crossing drew no halo');
  }

  return {
    centre: { x: Number(halo.getAttribute('cx')), y: Number(halo.getAttribute('cy')) },
    radius: Number(halo.getAttribute('r')),
  };
}

/** One leader as the mark states it: the point it leaves the halo at and the point it ends at. */
interface LeaderPath {
  readonly from: GridPoint;
  readonly to: GridPoint;
}

/**
 * The line tying a displaced crossing's name back to its halo, or `null` when the mark draws none.
 *
 * The path is read back from its own `d` attribute rather than from any state the component keeps, so a
 * case asserts what a reader's browser draws.
 */
function leaderOf(mark: Element): LeaderPath | null {
  const leader = mark.querySelector('path');

  if (leader === null) {
    return null;
  }

  const points = /^M ([-\d.]+) ([-\d.]+) L ([-\d.]+) ([-\d.]+)$/u.exec(
    leader.getAttribute('d') ?? '',
  );

  if (points === null) {
    throw new Error('the leader is not the two-point line this drawing states');
  }

  return {
    from: { x: Number(points[1]), y: Number(points[2]) },
    to: { x: Number(points[3]), y: Number(points[4]) },
  };
}

/** How far apart two points of the drawing's grid are, in its own units. */
function spanBetween(one: GridPoint, other: GridPoint): number {
  return Math.hypot(one.x - other.x, one.y - other.y);
}

describe('CompetitorNetwork', () => {
  it('prints every site and crossing name at a type-scale step whatever width the drawing is rendered at', () => {
    /* A wide frame — the atlas read at 1920 px — where one user unit of the drawing's own 760-unit view box
       is worth two CSS pixels: a name set at twelve of them would print at 24 px, larger than the page's
       section headings, and one set at forty would print at 80 px. jsdom computes no layout, so the box a
       browser would have measured is stated here, before the render whose effect reads it. */
    const renderedWidth = 1520;

    stateRenderedWidth(renderedWidth);
    renderNetwork();

    const scale = renderedWidth / viewBoxWidthOf();
    const names = [...drawing().querySelectorAll('text')];

    /* Every site of both families a name was printed for, and both crossings. */
    expect(names.length).toBeGreaterThanOrEqual(
      CLIENT_SITES.length + COMPETITOR_SITES.length + CHOKEPOINTS.length,
    );

    for (const name of names) {
      const fontPx = Number(name.getAttribute('font-size'));

      /* The step is the element's own `font-size` attribute — a `text-12` utility would state a user-unit
         size again and override it — and the product of it and the scale the element is drawn at is one of
         specification §4.3's four chart steps, however wide the frame is. */
      expect(Number.isFinite(fontPx)).toBe(true);
      expect(Math.round(fontPx * scale * 1000) / 1000).toBeGreaterThanOrEqual(12);
      expect(Math.round(fontPx * scale * 1000) / 1000).toBeLessThanOrEqual(16);
      expect(name.getAttribute('class') ?? '').not.toContain('text-12');
    }
  });

  it('ties a displaced crossing name back to its halo, and draws no leader for one printed beside it', () => {
    renderNetwork();

    const crowded = markFor(CROSSING_CROWDED);
    const alone = markFor(CROSSING_ALONE);

    /* Both crossings print their own name: a crossing is never left unnamed, whatever the placement had to
       do with the name. */
    expect(runOf(nameOf(crowded))).toBe('Crossing at the strait');
    expect(runOf(nameOf(alone))).toBe('Crossing at the far cape');

    /* The crossing recorded among the four client plants that ring it has no room beside its halo, so the
       placement moved its name and the drawing ties the two back together with a leader. */
    const leader = leaderOf(crowded);
    const crowdedHalo = haloOf(crowded);

    if (leader === null) {
      throw new Error('the displaced crossing drew no leader back to its halo');
    }

    /* The line leaves the halo on its own circumference, so it touches the ring a reader sees rather than the
       centre underneath it... */
    expect(Math.round(spanBetween(leader.from, crowdedHalo.centre) * 100) / 100).toBe(
      crowdedHalo.radius,
    );

    /* ... and it ends nearer the name it belongs to than the halo's centre is, so it runs towards the words
       rather than away from them. */
    const crowdedName = nameOf(crowded);
    const crowdedAnchor = {
      x: Number(crowdedName.getAttribute('x')),
      y: Number(crowdedName.getAttribute('y')),
    };

    expect(spanBetween(leader.to, crowdedAnchor)).toBeLessThan(
      spanBetween(crowdedHalo.centre, crowdedAnchor),
    );

    /* The crossing recorded away from every other mark keeps its name in the nearest ring beside its halo,
       and carries no leader: the two are already read as one. */
    const aloneHalo = haloOf(alone);
    const aloneName = nameOf(alone);

    expect(leaderOf(alone)).toBeNull();
    expect(
      spanBetween(aloneHalo.centre, {
        x: Number(aloneName.getAttribute('x')),
        y: Number(aloneName.getAttribute('y')),
      }),
    ).toBeLessThanOrEqual(aloneHalo.radius);
  });
});
