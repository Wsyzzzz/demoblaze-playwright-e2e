import { TAG } from '@constants/tags';
import { HOME_PAGE_PRODUCTS, PRODUCTS, totalOf } from '@data/products';
import { VALID_CHECKOUT } from '@data/checkout';
import { expect, test } from '@fixtures';

const { samsungGalaxyS6, nokiaLumia1520 } = PRODUCTS;

test.describe('Cart management', { tag: TAG.REGRESSION }, () => {
  test('CRT-013 Verify deleting one item updates the cart and Total', async ({ session, api, cartPage }) => {
    // Arrange through the API: fast, and keeps this test focused on the delete behaviour.
    await api.addProducts(session.token, [samsungGalaxyS6.id, nokiaLumia1520.id]);
    await cartPage.open();
    await cartPage.expectContents([samsungGalaxyS6, nokiaLumia1520]);

    await cartPage.deleteItem(samsungGalaxyS6);

    await cartPage.expectContents([nokiaLumia1520]);
  });

  test('CRT-014 Verify deleting all items empties the cart', async ({ session, api, cartPage }) => {
    await api.addProducts(session.token, [samsungGalaxyS6.id, nokiaLumia1520.id]);
    await cartPage.open();
    await cartPage.expectContents([samsungGalaxyS6, nokiaLumia1520]);

    await cartPage.deleteItem(samsungGalaxyS6);
    await cartPage.expectContents([nokiaLumia1520]);
    await cartPage.deleteItem(nokiaLumia1520);

    await cartPage.expectEmpty();
  });

  test('CRT-016 Verify the cart Total is correct with 10 items', async ({ session, api, cartPage }) => {
    // The 9 home-page products plus a second Samsung galaxy s6.
    const tenItems = [...HOME_PAGE_PRODUCTS, samsungGalaxyS6];
    await api.addProducts(
      session.token,
      tenItems.map((p) => p.id),
    );

    await cartPage.open();

    await cartPage.expectContents(tenItems);
    expect(totalOf(tenItems)).toBe(6380);
  });
});

test.describe('Cart on mobile', { tag: [TAG.REGRESSION, TAG.MOBILE] }, () => {
  test('CRT-018 Verify the Cart page and Place Order form are usable at mobile width', async ({
    session,
    api,
    cartPage,
    placeOrderModal,
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, 'Runs only in the mobile-chrome project');
    await api.addProducts(session.token, [samsungGalaxyS6.id, nokiaLumia1520.id]);

    await cartPage.open();
    await cartPage.expectContents([samsungGalaxyS6, nokiaLumia1520]);
    await expect(cartPage.placeOrderButton).toBeVisible();
    const hasHorizontalScroll = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasHorizontalScroll, 'no horizontal scrolling on the Cart page').toBe(false);

    await cartPage.openPlaceOrder();
    await placeOrderModal.expectOpenWithTotal(totalOf([samsungGalaxyS6, nokiaLumia1520]));
    await placeOrderModal.fill(VALID_CHECKOUT);
    await placeOrderModal.purchaseButton.scrollIntoViewIfNeeded();
    await expect(placeOrderModal.purchaseButton).toBeInViewport();
    await expect(placeOrderModal.closeButton).toBeInViewport();
  });
});
