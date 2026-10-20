import { TAG } from '@constants/tags';
import { VALID_CHECKOUT } from '@data/checkout';
import { PRODUCTS, totalOf } from '@data/products';
import { expect, test } from '@fixtures';
import { DEFECT, expectKnownDefect, knownDefectDetails } from '@fixtures/known-defect';
import { browserToday } from '@utils/dates';

const { samsungGalaxyS6, nokiaLumia1520 } = PRODUCTS;
const BASKET = [samsungGalaxyS6, nokiaLumia1520];

test.describe('Place order', { tag: TAG.REGRESSION }, () => {
  test(
    'CRT-025 Verify a logged-in user can place an order with valid details',
    { tag: TAG.SMOKE },
    async ({
      session: _session,
      homePage,
      productPage,
      cartPage,
      placeOrderModal,
      orderConfirmation,
      page,
    }) => {
      // End-to-end through the UI only: this is the business-critical journey from the brief.
      for (const product of BASKET) {
        await test.step(`add ${product.name}`, async () => {
          await homePage.open();
          await homePage.openProduct(product);
          await productPage.addToCart();
        });
      }

      await test.step('review cart', async () => {
        await cartPage.openFromNavBar();
        await cartPage.expectContents(BASKET);
      });

      await test.step('purchase', async () => {
        await cartPage.openPlaceOrder();
        await placeOrderModal.expectOpenWithTotal(totalOf(BASKET));
        await placeOrderModal.fill(VALID_CHECKOUT);
        await placeOrderModal.purchase();
      });

      await test.step('verify confirmation', async () => {
        const receipt = await orderConfirmation.read();
        expect(receipt.id).toMatch(/^\d+$/);
        expect(receipt.amount).toBe(totalOf(BASKET));
        expect(receipt.cardNumber).toBe(VALID_CHECKOUT.card);
        expect(receipt.name).toBe(VALID_CHECKOUT.name);
        // The date is verified separately in CRT-027 so one defect fails one test.
        await orderConfirmation.confirm();
        await expect(page).toHaveURL(/\/index\.html/);
      });
    },
  );

  test('CRT-024 Verify the Place Order form opens with the cart Total', async ({
    session,
    api,
    cartPage,
    placeOrderModal,
  }) => {
    await api.addProducts(
      session.token,
      BASKET.map((p) => p.id),
    );
    await cartPage.open();
    await cartPage.expectContents(BASKET);

    await cartPage.openPlaceOrder();

    await placeOrderModal.expectOpenWithTotal(totalOf(BASKET));
    for (const field of ['name', 'country', 'city', 'card', 'month', 'year'] as const) {
      await expect(placeOrderModal.field(field)).toBeVisible();
    }
    await expect(placeOrderModal.purchaseButton).toBeVisible();
    await expect(placeOrderModal.closeButton).toBeVisible();
  });

  test('CRT-026 Verify the cart is empty after a successful order', async ({
    session,
    api,
    cartPage,
    placeOrderModal,
    orderConfirmation,
  }) => {
    await api.addProducts(session.token, [samsungGalaxyS6.id]);
    await cartPage.open();
    await cartPage.expectContents([samsungGalaxyS6]);

    await cartPage.openPlaceOrder();
    await placeOrderModal.fill(VALID_CHECKOUT);
    await placeOrderModal.purchase();
    await orderConfirmation.read();
    await orderConfirmation.confirm();

    // DemoBlaze empties the cart with a fire-and-forget request, so wait for the server state first.
    await expect.poll(async () => (await api.viewCart(session.token)).length, { timeout: 15_000 }).toBe(0);
    await cartPage.open();
    await cartPage.expectEmpty();
  });

  test(
    "CRT-027 Verify the confirmation shows today's date",
    knownDefectDetails(DEFECT.WRONG_MONTH),
    async ({ session, api, cartPage, placeOrderModal, orderConfirmation, page }) => {
      expectKnownDefect(DEFECT.WRONG_MONTH);
      await api.addProducts(session.token, [samsungGalaxyS6.id]);
      await cartPage.open();
      await cartPage.expectContents([samsungGalaxyS6]);

      await cartPage.openPlaceOrder();
      await placeOrderModal.fill(VALID_CHECKOUT);
      await placeOrderModal.purchase();
      const receipt = await orderConfirmation.read();

      expect(receipt.date).toBe(await browserToday(page));
    },
  );

  test('CRT-028 Verify a guest can place an order', async ({
    homePage,
    productPage,
    cartPage,
    placeOrderModal,
    orderConfirmation,
    navBar,
  }) => {
    // Guests start on Home: that is where DemoBlaze creates the guest id cookie (see CRT-049).
    await homePage.open();
    await navBar.expectLoggedOut();
    await homePage.openProduct(nokiaLumia1520);
    await productPage.addToCart();
    await cartPage.open();
    await cartPage.expectContents([nokiaLumia1520]);

    await cartPage.openPlaceOrder();
    await placeOrderModal.fill(VALID_CHECKOUT);
    await placeOrderModal.purchase();
    const receipt = await orderConfirmation.read();
    expect(receipt.amount).toBe(nokiaLumia1520.price);
    await orderConfirmation.confirm();

    // The cart is emptied by a fire-and-forget request; re-open until the server state is visible.
    await expect(async () => {
      await cartPage.open();
      await expect(cartPage.rows).toHaveCount(0, { timeout: 3_000 });
    }).toPass({ timeout: 20_000 });
  });

  test(
    'CRT-029 Verify an order cannot be placed with an empty cart',
    knownDefectDetails(DEFECT.EMPTY_CART_ORDER),
    async ({ session: _session, cartPage, placeOrderModal, orderConfirmation }) => {
      expectKnownDefect(DEFECT.EMPTY_CART_ORDER);
      await cartPage.open();
      await cartPage.expectEmpty();

      await cartPage.openPlaceOrder();
      await placeOrderModal.fill(VALID_CHECKOUT);
      await placeOrderModal.purchase();

      await expect(orderConfirmation.title, 'no confirmation for an empty cart').toBeHidden();
    },
  );

  test(
    "CRT-043 Verify double-clicking 'Purchase' creates only one order",
    knownDefectDetails(DEFECT.DOUBLE_SUBMIT_PURCHASE),
    async ({ session, api, cartPage, placeOrderModal, orderConfirmation, page }) => {
      expectKnownDefect(DEFECT.DOUBLE_SUBMIT_PURCHASE);
      // Each order submission empties the cart with POST /deletecart, so count those calls.
      const submissions: string[] = [];
      page.on('request', (r) => {
        if (r.method() === 'POST' && r.url().endsWith('/deletecart')) submissions.push(r.url());
      });
      await api.addProducts(session.token, [samsungGalaxyS6.id]);
      await cartPage.open();
      await cartPage.expectContents([samsungGalaxyS6]);
      await cartPage.openPlaceOrder();
      await placeOrderModal.fill(VALID_CHECKOUT);

      await placeOrderModal.purchaseButton.dblclick();
      await orderConfirmation.read();

      expect(submissions, 'the order should be submitted exactly once').toHaveLength(1);
    },
  );
});
