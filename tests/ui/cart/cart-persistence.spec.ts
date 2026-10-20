import { env } from '@config/env';
import { TAG } from '@constants/tags';
import { PRODUCTS } from '@data/products';
import { expect, test } from '@fixtures';
import { DEFECT, expectKnownDefect, knownDefectDetails } from '@fixtures/known-defect';
import { CartPage } from '@pages/CartPage';
import { randomPassword, uniqueUsername } from '@utils/random';

const { samsungGalaxyS6, htcOneM9 } = PRODUCTS;

test.describe('Cart persistence and isolation', { tag: TAG.REGRESSION }, () => {
  test('CRT-020 Verify the cart is kept after logging out and back in', async ({
    session,
    api,
    homePage,
    navBar,
    loginModal,
    cartPage,
  }) => {
    await api.addProducts(session.token, [samsungGalaxyS6.id]);

    await homePage.open();
    await navBar.logOut();
    await navBar.openLogin();
    await loginModal.logIn(session.user.username, session.user.password);
    await navBar.expectLoggedInAs(session.user.username);

    await cartPage.open();
    await cartPage.expectContents([samsungGalaxyS6]);
  });

  test(
    "CRT-021 Verify a user's cart is not shown after logout",
    { tag: TAG.SECURITY },
    async ({ session, api, homePage, navBar, cartPage }) => {
      await api.addProducts(session.token, [samsungGalaxyS6.id]);

      await homePage.open();
      await navBar.logOut();
      await navBar.expectLoggedOut();

      await cartPage.open();
      await cartPage.expectEmpty();
    },
  );

  test(
    "CRT-022 Verify a user cannot see another user's cart items",
    { tag: TAG.SECURITY },
    async ({ session, api, browser }) => {
      // User A (this worker's account) has an item in the cart.
      await api.addProducts(session.token, [samsungGalaxyS6.id]);

      // User B: a separate throwaway account in a separate browser context.
      const userB = { username: uniqueUsername('qa_user_b'), password: randomPassword() };
      await api.createUser(userB.username, userB.password);
      const tokenB = await api.getToken(userB.username, userB.password);
      const contextB = await browser.newContext({ baseURL: env.baseUrl });
      try {
        await contextB.addCookies([{ name: 'tokenp_', value: tokenB, url: env.baseUrl }]);
        const cartB = new CartPage(await contextB.newPage());

        await cartB.open();

        await cartB.expectEmpty();
        await expect(cartB.row(samsungGalaxyS6)).toHaveCount(0);
      } finally {
        await contextB.close();
      }
    },
  );

  test(
    'CRT-023 Verify guest cart items are kept after logging in',
    knownDefectDetails(DEFECT.GUEST_CART_NOT_MERGED),
    async ({ api, testUser, homePage, productPage, navBar, loginModal, cartPage }) => {
      expectKnownDefect(DEFECT.GUEST_CART_NOT_MERGED);
      const token = await api.getToken(testUser.username, testUser.password);
      await api.clearCart(token);

      // As a guest (journey starts on Home, where the guest id is created).
      await homePage.open();
      await homePage.openProduct(htcOneM9);
      await productPage.addToCart();

      await navBar.openLogin();
      await loginModal.logIn(testUser.username, testUser.password);
      await navBar.expectLoggedInAs(testUser.username);

      await cartPage.open();
      await cartPage.expectContents([htcOneM9]);
    },
  );
});
