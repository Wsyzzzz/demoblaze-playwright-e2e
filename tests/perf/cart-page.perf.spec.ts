import { env } from '@config/env';
import { TAG } from '@constants/tags';
import { PRODUCTS, totalOf } from '@data/products';
import { expect, test } from '@fixtures';

const FIVE_ITEMS = [
  PRODUCTS.samsungGalaxyS6,
  PRODUCTS.nokiaLumia1520,
  PRODUCTS.nexus6,
  PRODUCTS.samsungGalaxyS7,
  PRODUCTS.sonyXperiaZ5,
];

test.describe('Performance budgets', { tag: TAG.PERF }, () => {
  test('CRT-019 Verify the Cart page loads within 3 seconds', async ({
    session,
    api,
    cartPage,
    page,
  }, testInfo) => {
    await api.addProducts(
      session.token,
      FIVE_ITEMS.map((p) => p.id),
    );

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
        : null;
    });
    const metrics = {
      cartReadyMs,
      budgetMs: env.perf.cartPageBudgetMs,
      items: FIVE_ITEMS.length,
      navigation,
    };
    await testInfo.attach('cart-page-metrics.json', {
      body: JSON.stringify(metrics, null, 2),
      contentType: 'application/json',
    });

    expect(cartReadyMs, `Cart ready in ${cartReadyMs} ms`).toBeLessThanOrEqual(env.perf.cartPageBudgetMs);
  });
});
