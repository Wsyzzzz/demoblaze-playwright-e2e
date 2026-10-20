import { expect, type Dialog, type Locator, type Page } from '@playwright/test';
import type { Product } from '../data/products';
import { acceptNextDialog } from '../utils/dialogs';
import { BasePage } from './BasePage';

export class ProductPage extends BasePage {
  readonly name: Locator;
  readonly price: Locator;
  readonly addToCartButton: Locator;

  constructor(page: Page) {
    super(page);
    this.name = page.locator('#tbodyid h2.name');
    this.price = page.locator('#tbodyid h3.price-container');
    this.addToCartButton = page.getByRole('link', { name: 'Add to cart' });
  }

  async open(product: Product): Promise<void> {
    await this.page.goto(`/prod.html?idp_=${product.id}`);
    await this.expectProduct(product);
  }

  async expectProduct(product: Product): Promise<void> {
    await expect(this.name).toHaveText(product.name);
    await expect(this.price).toContainText(`$${product.price}`);
  }

  /** Clicks "Add to cart" and returns the alert text. */
  async addToCart(): Promise<string> {
    await expect(this.addToCartButton).toBeVisible();
    return acceptNextDialog(this.page, () => this.addToCartButton.click());
  }

  /**
   * Clicks "Add to cart" `times` times without waiting in between, like an impatient user, so
   * the requests are in flight together. Accepts every alert and returns their texts.
   */
  async addToCartRapidly(times: number): Promise<string[]> {
    const alerts: string[] = [];
    const onDialog = (dialog: Dialog): void => {
      alerts.push(dialog.message());
      void dialog.accept().catch(() => undefined);
    };
    await expect(this.addToCartButton).toBeVisible();
    this.page.on('dialog', onDialog);
    try {
      for (let i = 0; i < times; i++) await this.addToCartButton.click();
      await expect.poll(() => alerts.length, { message: `one alert per click (${times})` }).toBe(times);
      return alerts;
    } finally {
      this.page.off('dialog', onDialog);
    }
  }
}
