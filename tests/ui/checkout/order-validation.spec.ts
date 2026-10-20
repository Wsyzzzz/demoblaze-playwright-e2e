import { ALERT } from '@constants/messages';
import { TAG } from '@constants/tags';
import { REQUIRED_FIELD_CASES } from '@data/order-validation';
import { PRODUCTS } from '@data/products';
import { expect, test } from '@fixtures';

test.describe('Place order – required fields', { tag: TAG.REGRESSION }, () => {
  test.beforeEach(async ({ session, api, cartPage }) => {
    await api.addProducts(session.token, [PRODUCTS.samsungGalaxyS6.id]);
    await cartPage.open();
    await cartPage.expectContents([PRODUCTS.samsungGalaxyS6]);
    await cartPage.openPlaceOrder();
  });

  for (const data of REQUIRED_FIELD_CASES) {
    test(`${data.id} ${data.title}`, async ({ placeOrderModal, orderConfirmation, cartPage }) => {
      await placeOrderModal.fill(data.details);

      const message = await placeOrderModal.purchaseExpectingAlert();

      expect(message).toBe(ALERT.ORDER_FIELDS_REQUIRED);
      await expect(placeOrderModal.root).toBeVisible();
      await expect(orderConfirmation.title).toBeHidden();
      await expect(cartPage.rows, 'cart is unchanged').toHaveCount(1);
    });
  }
});
