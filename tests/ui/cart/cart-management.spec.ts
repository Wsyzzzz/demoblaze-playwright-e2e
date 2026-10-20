import { TAG } from '@constants/tags';
import { PRODUCTS } from '@data/products';
import { test } from '@fixtures';

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
});
