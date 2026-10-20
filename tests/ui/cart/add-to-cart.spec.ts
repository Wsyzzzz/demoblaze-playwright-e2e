import { ALERT } from '@constants/messages';
import { TAG } from '@constants/tags';
import { PRODUCTS } from '@data/products';
import { expect, test } from '@fixtures';
import { DEFECT } from '@fixtures/known-defect';

const { samsungGalaxyS6, nokiaLumia1520 } = PRODUCTS;

test.describe('Add to cart', { tag: TAG.REGRESSION }, () => {
  test(
    'CRT-006 Verify a logged-in user can add a product to the cart',
    { tag: TAG.SMOKE },
    async ({ session: _session, homePage, productPage, cartPage }) => {
      await homePage.open();
      await homePage.openProduct(samsungGalaxyS6);
      await productPage.expectProduct(samsungGalaxyS6);

      const message = await productPage.addToCart();
      expect(message).toBe(ALERT.PRODUCT_ADDED);

      await cartPage.openFromNavBar();
      await cartPage.expectContents([samsungGalaxyS6]);
    },
  );

  test(
    'CRT-007 Verify a guest can add a product to the cart',
    {
      // Alert text differs for guests (PD-06). Tracked as a defect, not asserted, so this
      // test still guards the main behaviour: the item reaches the guest cart.
      annotation: {
        type: 'issue',
        description: `${DEFECT.GUEST_ALERT_TEXT.id}: ${DEFECT.GUEST_ALERT_TEXT.summary}`,
      },
    },
    async ({ productPage, cartPage, navBar }) => {
      await productPage.open(nokiaLumia1520);
      await navBar.expectLoggedOut();

      const message = await productPage.addToCart();
      expect(message).toMatch(/^Product added\.?$/);

      await cartPage.open();
      await cartPage.expectContents([nokiaLumia1520]);
    },
  );

  test('CRT-008 Verify multiple different products can be added', async ({
    session: _session,
    homePage,
    productPage,
    cartPage,
  }) => {
    for (const product of [samsungGalaxyS6, nokiaLumia1520]) {
      await test.step(`add ${product.name}`, async () => {
        await homePage.open();
        await homePage.openProduct(product);
        expect(await productPage.addToCart()).toBe(ALERT.PRODUCT_ADDED);
      });
    }

    await cartPage.open();
    await cartPage.expectContents([samsungGalaxyS6, nokiaLumia1520]);
  });
});
