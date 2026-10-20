import { ALERT } from '@constants/messages';
import { TAG } from '@constants/tags';
import { PRODUCTS } from '@data/products';
import { expect, test } from '@fixtures';
import { DEFECT, expectKnownDefect, knownDefectDetails } from '@fixtures/known-defect';

const { samsungGalaxyS6, nokiaLumia1520, nexus6, sonyVaioI5 } = PRODUCTS;

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
    async ({ homePage, productPage, cartPage, navBar }) => {
      // Guests start on Home: that is where DemoBlaze creates the guest id cookie (see CRT-049).
      await homePage.open();
      await navBar.expectLoggedOut();
      await homePage.openProduct(nokiaLumia1520);

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

  // CRT-010 and CRT-011: every 'Product added.' alert must mean a saved item. (Once, in manual testing,
  // an item went missing; if that ever comes back, the trace shows which /addtocart call was lost.)
  test("CRT-010 Verify every 'Product added.' alert results in a saved item", async ({
    session: _session,
    homePage,
    productPage,
    cartPage,
  }) => {
    const picks = [samsungGalaxyS6, samsungGalaxyS6, nokiaLumia1520];
    for (const product of picks) {
      await test.step(`add ${product.name}`, async () => {
        await homePage.open();
        await homePage.openProduct(product);
        expect(await productPage.addToCart()).toBe(ALERT.PRODUCT_ADDED);
      });
    }

    await cartPage.openFromNavBar();
    await cartPage.expectContents(picks);
  });

  test("CRT-011 Verify rapid repeated 'Add to cart' clicks are all saved", async ({
    session: _session,
    homePage,
    productPage,
    cartPage,
  }) => {
    await homePage.open();
    await homePage.openProduct(nexus6);
    await productPage.expectProduct(nexus6);

    const alerts = await productPage.addToCartRapidly(3);
    expect(alerts).toEqual([ALERT.PRODUCT_ADDED, ALERT.PRODUCT_ADDED, ALERT.PRODUCT_ADDED]);

    await cartPage.openFromNavBar();
    await cartPage.expectContents([nexus6, nexus6, nexus6]);
  });

  test('CRT-005 Verify a product from the Laptops category can be added to the cart', async ({
    session: _session,
    homePage,
    productPage,
    cartPage,
  }) => {
    await homePage.open();
    await homePage.selectCategory('Laptops');
    await expect(homePage.productLink(samsungGalaxyS6), 'phones are filtered out').toBeHidden();

    await homePage.openProduct(sonyVaioI5);
    await productPage.expectProduct(sonyVaioI5);
    expect(await productPage.addToCart()).toBe(ALERT.PRODUCT_ADDED);

    await cartPage.open();
    await cartPage.expectContents([sonyVaioI5]);
  });

  test(
    'CRT-049 Verify a guest who opens a product page directly gets a private cart',
    knownDefectDetails(DEFECT.SHARED_GUEST_CART, [TAG.SECURITY]),
    async ({ productPage, page }) => {
      expectKnownDefect(DEFECT.SHARED_GUEST_CART);

      // A guest arriving from a search result or shared link never visits the Home page.
      const addToCartRequest = page.waitForRequest((r) => r.url().endsWith('/addtocart'));
      await productPage.open(nokiaLumia1520);
      await productPage.addToCart();

      const { cookie } = (await addToCartRequest).postDataJSON() as { cookie: string };
      expect(cookie, 'guest cart must be keyed by a unique guest id').toMatch(/(^|;\s*)user=[0-9a-f-]{36}/);
    },
  );
});
