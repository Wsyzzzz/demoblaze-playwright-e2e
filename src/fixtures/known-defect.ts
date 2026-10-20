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
  WHITESPACE_INPUT: { id: 'PD-05', summary: 'Whitespace-only input passes the required-field check' },
  REVERSIBLE_PASSWORD: { id: 'PD-07', summary: 'Password is sent Base64-encoded (reversible)' },
  GUEST_CART_NOT_MERGED: { id: 'PD-09', summary: 'Guest cart items are not carried over after login' },
  ENTER_DOES_NOT_SUBMIT: { id: 'PD-10', summary: 'Enter key does not submit the Login form' },
  MODAL_KEEPS_VALUES: { id: 'PD-11', summary: 'Modal fields keep previous values after closing' },
  DOUBLE_SUBMIT_LOGIN: { id: 'PD-23', summary: "Double-clicking 'Log in' sends two login requests" },
  DOUBLE_SUBMIT_PURCHASE: { id: 'PD-24', summary: "Double-clicking 'Purchase' submits the order twice" },
  NO_LOCKOUT: { id: 'PD-25', summary: 'No lockout or rate limit after repeated failed logins' },
  USERNAME_NOT_TRIMMED: { id: 'PD-26', summary: 'Login does not trim spaces around the username' },
  USERNAME_CASE_SENSITIVE: { id: 'PD-27', summary: 'Login treats the username as case-sensitive' },
  COOKIE_FLAGS: { id: 'PD-08', summary: 'Auth cookie tokenp_ lacks Secure/HttpOnly flags' },
  PREDICTABLE_TOKEN: { id: 'PD-18', summary: 'Auth token is Base64 of username + number' },
  HTTP_200_ERRORS: { id: 'PD-19', summary: 'API returns HTTP 200 for error responses' },
  SHARED_GUEST_CART: {
    id: 'PD-22',
    summary: 'Guests who open a product page directly all share one cart (empty guest id)',
  },
} as const satisfies Record<string, KnownDefect>;
