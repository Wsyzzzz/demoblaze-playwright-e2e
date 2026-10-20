/**
 * Test tags. Select with --grep, e.g. `npx playwright test --grep @smoke`.
 * Every test is part of regression; @smoke marks the critical-path subset run on every commit.
 */
export const TAG = {
  SMOKE: '@smoke',
  REGRESSION: '@regression',
  API: '@api',
  SECURITY: '@security',
  PERF: '@perf',
  MOBILE: '@mobile',
  /** Runs on Chromium only: a site defect that one browser engine is enough to reproduce. */
  CHROMIUM_ONLY: '@chromium-only',
  /** Test documents an open defect and is expected to fail until it is fixed. */
  KNOWN_DEFECT: '@known-defect',
} as const;
