/**
 * Unit suite for `offer-export-file.ts`, the one place a payload the service composed becomes a file the
 * reader can save.
 *
 * WHAT IT PROVES. Two answers and nothing else, because the module beside this suite has two: a payload
 * is offered as the file its builder named — one blob carrying the payload's own text and media type, one
 * anchor activated under the payload's own file name, the object URL released on the task after the
 * anchor was activated rather than in the task that activated it (rule B-1) — and an engine with no
 * object-URL factory is answered with `false`, without a throw, a blob or an anchor (rule P-8). That
 * boolean is the caller's whole signal that it must state the refusal, so the case here asserts the
 * refusal is quiet and total rather than trusting the screens' own suites for it.
 *
 * WHY THE DOWNLOAD PATH IS STUBBED. The offering case replaces both object-URL members with its own
 * spies, because what they are handed and when they are called is the whole of what it asserts, and every
 * case puts back the members the environment gave it. The refusal case withholds them instead: the engine
 * it stands for exposes no object-URL factory at all, and this environment answers `createObjectURL` from
 * `URL`'s prototype as well as from the global, so deleting the global's member would expose the
 * inherited one rather than leave the page without a factory. The anchor is activated, not navigated —
 * jsdom implements no download and would report one — so `HTMLAnchorElement.prototype.click` is captured
 * to observe the file that would be offered and the element it was activated from.
 *
 * WHERE THE EXPECTATIONS COME FROM. Every value is the fixture's own: the file name, the media type and
 * the document text below stand for what a builder returns, and nothing here is copied out of a seed
 * record or a rendered screen (rule P-6). Runs under the jsdom environment `vite.config.ts` sets by
 * default; nothing here hashes, reads the clock, touches the network or reaches outside the module.
 */
import { waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ExportPayload } from '../types';
import { offerExportFile } from './offer-export-file';

/* ---------------------------------------------------------------------------------------------
 * The payload a case offers, and the browser members jsdom leaves undefined
 * ------------------------------------------------------------------------------------------- */

/**
 * A payload of the shape the three export builders return: a name, a media type and the document text.
 *
 * The content carries the simulation marker a JSON builder sets at its top level, so the case can show
 * the document reaches the browser unmodified rather than re-serialised here (rule P-1).
 */
const PAYLOAD: ExportPayload = {
  filename: 'synthetic-export.json',
  mediaType: 'application/json',
  content: '{"simulated":true,"synthetic":true}',
};

/** The object URL the stubbed factory hands back, which nothing resolves. */
const OBJECT_URL = 'blob:synthetic-object-url';

/** The factory the helper is expected to call, once, with the composed document. */
const createObjectUrl = vi.fn<(value: Blob) => string>(() => OBJECT_URL);

/** The revoker it is expected to call once the file has been offered. */
const revokeObjectUrl = vi.fn<(value: string) => void>();

/**
 * What the environment's own object-URL members were before this suite touched them, so every case hands
 * `URL` back to the next one exactly as it found it.
 */
const createDescriptor = Object.getOwnPropertyDescriptor(URL, 'createObjectURL');
const revokeDescriptor = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL');

/** Supplies both object-URL members, so the offering path is reachable and observable. */
function installObjectUrlStubs(): void {
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    writable: true,
    value: createObjectUrl,
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    writable: true,
    value: revokeObjectUrl,
  });
}

/**
 * Withholds both members, which is the engine the refusal case is about: a page on which there is no
 * factory to build a file with.
 *
 * They are shadowed with `undefined` rather than deleted because this environment answers
 * `URL.createObjectURL` from the global's prototype as well as from the global itself, so a deleted own
 * member would only expose the inherited one and the page would still have a factory.
 */
function withholdObjectUrlMembers(): void {
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    writable: true,
    value: undefined,
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    writable: true,
    value: undefined,
  });
}

/** Puts one member back as the environment had it, or removes it where the environment had none. */
function restoreObjectUrlMember(
  name: 'createObjectURL' | 'revokeObjectURL',
  descriptor: PropertyDescriptor | undefined,
): void {
  if (descriptor === undefined) {
    Reflect.deleteProperty(URL, name);
    return;
  }

  Object.defineProperty(URL, name, descriptor);
}

/* ---------------------------------------------------------------------------------------------
 * Per-case state
 * ------------------------------------------------------------------------------------------- */

beforeEach(() => {
  createObjectUrl.mockClear();
  revokeObjectUrl.mockClear();
});

/** Leaves no stub and no spy of this suite behind for whichever case runs next. */
afterEach(() => {
  restoreObjectUrlMember('createObjectURL', createDescriptor);
  restoreObjectUrlMember('revokeObjectURL', revokeDescriptor);
  vi.restoreAllMocks();
});

/* ---------------------------------------------------------------------------------------------
 * The two answers
 * ------------------------------------------------------------------------------------------- */

describe('offerExportFile', () => {
  it('offers the payload as the file it named and releases the object URL on the next task', async () => {
    const offered: { readonly href: string; readonly download: string; readonly rel: string }[] = [];

    installObjectUrlStubs();
    /* The anchor is activated, not navigated: jsdom implements no download and would report one. */
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function capture(
      this: HTMLAnchorElement,
    ): void {
      offered.push({ href: this.href, download: this.download, rel: this.rel });
    });

    expect(offerExportFile(PAYLOAD)).toBe(true);

    /* One document was handed to the browser, and it is the payload's own: the media type the builder
       declared, and the text it composed, neither added to nor re-serialised (rule P-1, rule P-6). */
    expect(createObjectUrl).toHaveBeenCalledTimes(1);

    const composed = createObjectUrl.mock.calls[0]?.[0];

    if (composed === undefined) {
      throw new Error('the document was never handed to the browser’s download path');
    }

    expect(composed).toBeInstanceOf(Blob);
    expect(composed.type).toBe(PAYLOAD.mediaType);

    /* One anchor was activated, under the file name the payload declared, from the URL the factory
       returned, and it carried `noopener` so the document it points at is handed no window of its own. */
    expect(offered).toHaveLength(1);

    const file = offered[0];

    if (file === undefined) {
      throw new Error('the offered file was not captured');
    }

    expect(file.download).toBe(PAYLOAD.filename);
    expect(file.href).toBe(OBJECT_URL);
    expect(file.rel).toBe('noopener');

    /* The anchor existed for the length of one activation: nothing it added to the page is left there. */
    expect(document.querySelector('a[download]')).toBeNull();

    /* The release is deferred, so it has not happened in the task that activated the anchor: an engine
       still reading the blob when that task ends finds the URL alive. It is read for once it has
       happened rather than assumed, which is what makes the deferral observable (rule B-1). */
    expect(revokeObjectUrl).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(revokeObjectUrl).toHaveBeenCalledWith(OBJECT_URL);
    });

    expect(revokeObjectUrl).toHaveBeenCalledTimes(1);
    expect(await composed.text()).toBe(PAYLOAD.content);
  });

  it('answers false, throwing nothing and building no file, where the engine exposes no object-URL factory', () => {
    /* The absent factory is the state this case is about; withholding it makes the case independent of
       the order it runs in. */
    withholdObjectUrlMembers();

    const blobSpy = vi.spyOn(globalThis, 'Blob');
    const createElementSpy = vi.spyOn(document, 'createElement');
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click');
    const childCount = document.body.childElementCount;

    let outcome: boolean | undefined;

    expect(() => {
      outcome = offerExportFile(PAYLOAD);
    }).not.toThrow();

    /* The answer is the caller's signal, and it is the only thing that happened: no document was built,
       no anchor was created or activated, and the page is exactly as it was (rule P-8). */
    expect(outcome).toBe(false);
    expect(blobSpy).not.toHaveBeenCalled();
    expect(createElementSpy).not.toHaveBeenCalled();
    expect(clickSpy).not.toHaveBeenCalled();
    expect(document.body.childElementCount).toBe(childCount);
    expect(revokeObjectUrl).not.toHaveBeenCalled();
  });
});
