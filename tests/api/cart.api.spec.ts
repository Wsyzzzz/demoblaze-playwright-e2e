import { TAG } from '@constants/tags';
import { PRODUCTS } from '@data/products';
import { expect, test } from '@fixtures';

test.describe('Cart API', { tag: [TAG.REGRESSION, TAG.API] }, () => {
  let token: string;

  test.beforeEach(async ({ api, testUser }) => {
    token = await api.getToken(testUser.username, testUser.password);
    await api.clearCart(token);
  });

  test(
    'CRT-046 Verify POST /addtocart stores the item returned by /viewcart',
    { tag: TAG.SMOKE },
    async ({ api }) => {
      const { response, itemId } = await api.addToCart(token, PRODUCTS.samsungGalaxyS6.id);
      expect(response.status()).toBe(200);

      const viewResponse = await api.viewCartRaw(token);
      expect(viewResponse.status()).toBe(200);
      const { Items } = (await viewResponse.json()) as { Items: { id: string; prod_id: number }[] };
      expect(Items).toContainEqual(
        expect.objectContaining({ id: itemId, prod_id: PRODUCTS.samsungGalaxyS6.id }),
      );
    },
  );

  test('CRT-047 Verify POST /deleteitem removes the item from the cart', async ({ api }) => {
    const [itemId] = await api.addProducts(token, [PRODUCTS.nokiaLumia1520.id]);

    const response = await api.deleteItem(itemId);

    expect(response.status()).toBe(200);
    const remaining = (await api.viewCart(token)).map((item) => item.id);
    expect(remaining).not.toContain(itemId);
  });
});
