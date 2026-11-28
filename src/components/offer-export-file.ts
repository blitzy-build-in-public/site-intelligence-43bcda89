/**
 * The one place a payload the service composed becomes a file the reader can save, shared by the three
 * screens that offer one (AAP 0.2.1 F15 and AAP 0.7's SCR-04, SCR-07 and SCR-13 rows).
 *
 * WHY THE PROCEDURE HAS ONE OWNER. Building the document, pointing an anchor at it, activating the
 * anchor and releasing the object URL is one procedure, and SCR-04, SCR-07 and SCR-13 each used to carry
 * a private copy of it. The copies drifted: the atlas copy lost the object-URL feature check its two
 * siblings carried, so the engine on which those two exports degrade to a stated refusal was the engine
 * on which the atlas export threw. A behaviour every caller needs has exactly one definition, and that
 * definition lives here rather than inside one of the features for two reasons: a feature may not import
 * another feature (AAP 0.18.1), and a screen that stops offering a file should not have to restate how a
 * file is offered.
 *
 * WHY THE FEATURE CHECK RETURNS RATHER THAN THROWS. An engine that exposes no object-URL factory has
 * nothing to offer: no URL to point the anchor at, and so no file. Letting the missing member throw would
 * report a failure of the export itself, which did not fail — the service composed the document and
 * recorded the export on the trail before this runs — and it would report it as an exception where the
 * reader needs a sentence. The helper therefore answers `false`, and each caller states the reason in
 * its own export error region beside the actions, which is the explanation rule P-8 owes a reader whose
 * control could not perform its function.
 *
 * WHY THE ANCHOR IS ATTACHED BEFORE IT IS ACTIVATED AND REMOVED AFTER. Some browsers ignore the
 * synthetic click of an anchor that is not in the document, so the anchor joins `document.body` for the
 * length of one activation and is removed immediately afterwards, leaving no element behind that the
 * reader did not ask for. It is not a control a screen renders, so it adds no focus stop and no
 * interactive element to the page (rule B-3).
 *
 * WHY THE OBJECT URL IS RELEASED ON THE NEXT TASK. The click hands the blob to the browser's download
 * machinery, which may still be reading it when the task that activated the anchor ends. Releasing the
 * URL in that same task would revoke it under an engine that had not finished, so the release is queued
 * for the task after.
 *
 * THE FILE LEAVES FROM THE APPLICATION'S OWN ORIGIN AND ASKS NOBODY FOR ANYTHING (rule B-1). The
 * document is already in memory, the URL that carries it is a `blob:` URL of this origin, and offering
 * it opens no address: no request leaves for this application or for any other host. The file name and
 * media type are the payload's own, so no screen invents either, and the document's text is written into
 * the blob unmodified, so the `"simulated": true` marker its builder set at the top level survives
 * (rules P-1, P-6).
 *
 * Rules served:
 * - B-1: the file is offered from a `blob:` URL of this origin; nothing is fetched.
 * - B-2: no address, no credential and no configuration value is read.
 * - B-3: the anchor exists for one activation and leaves no focus stop behind.
 * - P-1, P-6: the payload's name, media type and text are the builder's own, unmodified.
 * - P-8: a caller receiving `false` states the refusal rather than leaving the reader unanswered.
 */
import type { ExportPayload } from '../types';

/**
 * Offers one export payload as a downloaded file, and reports whether it could.
 *
 * The document arrives composed: this function writes nothing into it and rewrites no field, so the
 * `"simulated": true` marker its builder set survives untouched (rule P-1), and the name and media type
 * are the payload's own, which is why the saved file is the one the builder declared rather than a name
 * typed at a call site (rule P-6).
 *
 * The boolean is the whole of what a caller has to act on. `true` means the file was handed to the
 * browser; `false` means this page cannot offer a file at all, and the caller states that in its own
 * export error region so the reader is answered rather than left with a control that did nothing (rule
 * P-8). Nothing is thrown: a page that cannot offer a file has not failed to export.
 *
 * @param payload - The download payload the service returned, unmodified.
 * @returns `true` when the file was offered, `false` when this page cannot offer one.
 */
export function offerExportFile(payload: ExportPayload): boolean {
  if (typeof URL.createObjectURL !== 'function') {
    return false;
  }

  const url = URL.createObjectURL(new Blob([payload.content], { type: payload.mediaType }));
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = payload.filename;
  anchor.rel = 'noopener';

  /* The anchor is attached before it is activated and removed immediately after: a detached anchor's
     synthetic click is ignored by some browsers, and leaving it in the document would add an element to
     the page that no reader asked for. */
  document.body.append(anchor);
  anchor.click();
  anchor.remove();

  /* The click above has handed the blob to the browser's download machinery, which may still be reading
     it when this task ends: the URL is released on the next task so an engine that reads it
     asynchronously still finds it. */
  globalThis.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);

  return true;
}
