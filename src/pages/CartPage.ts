import { expect, type Locator, type Page } from '@playwright/test';
import { totalOf, type Product } from '../data/products';
import { BasePage } from './BasePage';

export interface CartRow {
  title: string;
  price: number;
}

const isViewCart = (url: string): boolean => url.includes('/viewcart');

export class CartPage extends BasePage {
  readonly rows: Locator;
  readonly total: Locator;
  readonly placeOrderButton: Locator;

  constructor(page: Page) {
    super(page);
    this.rows = page.locator('#tbodyid > tr');
    this.total = page.locator('#totalp');
    this.placeOrderButton = page.getByRole('button', { name: 'Place Order' });
  }

  /**
   * Opens the cart and waits for the cart API call to finish. Without this wait an
   * "empty cart" assertion could pass before the rows have loaded.
   */
  async open(): Promise<void> {
    await Promise.all([
      this.page.waitForResponse((r) => isViewCart(r.url()) && r.ok()),
      this.page.goto('/cart.html'),
    ]);
  }

  async openFromNavBar(): Promise<void> {
    await Promise.all([
      this.page.waitForResponse((r) => isViewCart(r.url()) && r.ok()),
      this.navBar.goToCart(),
    ]);
  }

  row(product: Product): Locator {
    return this.rows.filter({ has: this.page.getByRole('cell', { name: product.name, exact: true }) });
  }

  async readRows(): Promise<CartRow[]> {
    const rows = await this.rows.all();
    return Promise.all(
      rows.map(async (row) => ({
        title: (await row.locator('td').nth(1).innerText()).trim(),
        price: Number(await row.locator('td').nth(2).innerText()),
      })),
    );
  }

  /** Asserts the cart contains exactly these products (any order) and the matching total. */
  async expectContents(products: readonly Product[]): Promise<void> {
    await expect(this.rows).toHaveCount(products.length);
    const expected = products.map((p) => ({ title: p.name, price: p.price }));
    const byTitle = (a: CartRow, b: CartRow) => a.title.localeCompare(b.title) || a.price - b.price;
    expect((await this.readRows()).sort(byTitle)).toEqual(expected.sort(byTitle));
    if (products.length > 0) {
      await expect(this.total).toHaveText(String(totalOf(products)));
    }
  }

  async expectEmpty(): Promise<void> {
    await expect(this.rows).toHaveCount(0);
  }

  /** Deletes the first row for the product. DemoBlaze reloads the page after the delete. */
  async deleteItem(product: Product): Promise<void> {
    const deleteLink = this.row(product).first().getByRole('link', { name: 'Delete' });
    await Promise.all([this.page.waitForResponse((r) => isViewCart(r.url()) && r.ok()), deleteLink.click()]);
  }

  async openPlaceOrder(): Promise<void> {
    await this.placeOrderButton.click();
  }
}
