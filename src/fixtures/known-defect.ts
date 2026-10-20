import { TAG } from '../constants/tags';
import { test } from './index';

export interface KnownDefect {
  id: string;
  summary: string;
}

/** Test details for a case that documents an open defect: tag + an "issue" annotation in the report. */
export function knownDefectDetails(defect: KnownDefect, extraTags: string[] = []) {
  return {
    tag: [TAG.KNOWN_DEFECT, ...extraTags],
    annotation: { type: 'issue', description: `${defect.id}: ${defect.summary}` },
  };
}

/**
 * Call at the start of a known-defect test. The test is reported as "expected to fail";
 * once the defect is fixed it passes unexpectedly and CI flags it, so the marker can be removed.
 */
export function expectKnownDefect(defect: KnownDefect): void {
  test.fail(true, `${defect.id}: ${defect.summary}`);
}

/** Open defects referenced by automated tests (IDs match the "Potential Defects" sheet). */
export const DEFECT = {
  EMPTY_CART_ORDER: { id: 'PD-01', summary: 'Order can be placed with an empty cart' },
  WRONG_MONTH: { id: 'PD-02', summary: 'Confirmation date month is one behind (0-based month)' },
  GUEST_ALERT_TEXT: { id: 'PD-06', summary: "Guest add-to-cart alert reads 'Product added' (no full stop)" },
  COOKIE_FLAGS: { id: 'PD-08', summary: 'Auth cookie tokenp_ lacks Secure/HttpOnly flags' },
  PREDICTABLE_TOKEN: { id: 'PD-18', summary: 'Auth token is Base64 of username + number' },
  HTTP_200_ERRORS: { id: 'PD-19', summary: 'API returns HTTP 200 for error responses' },
} as const satisfies Record<string, KnownDefect>;
