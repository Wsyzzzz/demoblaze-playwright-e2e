import type { Page } from '@playwright/test';

/**
 * Today's date as DemoBlaze formats it on the purchase confirmation (D/M/YYYY, no padding),
 * read from the browser so it uses the same timezone as the page under test.
 */
export async function browserToday(page: Page): Promise<string> {
  return page.evaluate(() => {
    const d = new Date();
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  });
}
