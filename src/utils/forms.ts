import { expect, type Locator } from '@playwright/test';

/**
 * Fills inputs and verifies every value stuck, retrying if not.
 *
 * DemoBlaze's Bootstrap modals move focus to the dialog when their opening animation
 * ends. On slower engines (Firefox, WebKit) that focus change can land in the middle of
 * typing and leave a field empty, so a plain fill() is not reliable here.
 */
export async function fillAndVerify(fields: ReadonlyArray<readonly [Locator, string]>): Promise<void> {
  await expect(async () => {
    for (const [input, value] of fields) {
      await input.fill(value);
    }
    for (const [input, value] of fields) {
      await expect(input).toHaveValue(value, { timeout: 1_000 });
    }
  }).toPass({ timeout: 10_000 });
}
