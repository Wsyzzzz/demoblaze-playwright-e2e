import { env } from '@config/env';
import { TAG } from '@constants/tags';
import { PRODUCTS, totalOf } from '@data/products';
import { expect, test } from '@fixtures';
import { CartPage } from '@pages/CartPage';
import type { Browser } from '@playwright/test';

const FIVE_ITEMS = [
  PRODUCTS.samsungGalaxyS6,
  PRODUCTS.nokiaLumia1520,
  PRODUCTS.nexus6,
  PRODUCTS.samsungGalaxyS7,
  PRODUCTS.sonyXperiaZ5,
];

/** One measurement is at the mercy of a single slow request; the median of three is not. */
const SAMPLES = 3;

interface CartLoadSample {
  cartReadyMs: number;
  domContentLoadedMs: number | null;
  loadEventMs: number | null;
  transferSizeBytes: number | null;
}

const median = (values: number[]): number =>
  [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)] ?? NaN;

/**
 * Loads the cart in a brand-new browser context: empty cache, only the auth cookie, like a
 * first visit. Timing stops when every row and the Total are on screen.
 */
async function measureColdCartLoad(browser: Browser, token: string): Promise<CartLoadSample> {
  const context = await browser.newContext({ baseURL: env.baseUrl });
  try {
    await context.addCookies([{ name: 'tokenp_', value: token, url: env.baseUrl }]);
    const page = await context.newPage();
    const cartPage = new CartPage(page);

    const start = Date.now();
    await page.goto('/cart.html');
    await expect(cartPage.rows).toHaveCount(FIVE_ITEMS.length);
    await expect(cartPage.total).toHaveText(String(totalOf(FIVE_ITEMS)));
    const cartReadyMs = Date.now() - start;

    const navigation = await page.evaluate(() => {
      const [nav] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      return nav
        ? {
            domContentLoadedMs: Math.round(nav.domContentLoadedEventEnd),
            loadEventMs: Math.round(nav.loadEventEnd),
            transferSizeBytes: nav.transferSize,
          }
        : { domContentLoadedMs: null, loadEventMs: null, transferSizeBytes: null };
    });
    return { cartReadyMs, ...navigation };
  } finally {
    await context.close();
  }
}

test.describe('Performance budgets', { tag: TAG.PERF }, () => {
  test('CRT-019 Verify the Cart page loads within 3 seconds', async ({ session, api, browser }, testInfo) => {
    await api.addProducts(
      session.token,
      FIVE_ITEMS.map((p) => p.id),
    );

    const samples: CartLoadSample[] = [];
    for (let i = 1; i <= SAMPLES; i++) {
      samples.push(
        await test.step(`cold load ${i} of ${SAMPLES}`, () => measureColdCartLoad(browser, session.token)),
      );
    }
    const cartReadyMs = median(samples.map((s) => s.cartReadyMs));

    await testInfo.attach('cart-page-metrics.json', {
      body: JSON.stringify(
        { cartReadyMs, budgetMs: env.perf.cartPageBudgetMs, items: FIVE_ITEMS.length, samples },
        null,
        2,
      ),
      contentType: 'application/json',
    });

    expect(
      cartReadyMs,
      `Median cart ready time ${cartReadyMs} ms (samples: ${samples.map((s) => s.cartReadyMs).join(', ')} ms)`,
    ).toBeLessThanOrEqual(env.perf.cartPageBudgetMs);
  });
});
