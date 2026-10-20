import { expect, type Locator, type Page } from '@playwright/test';
import type { Product } from '../data/products';
import { BasePage } from './BasePage';

export class HomePage extends BasePage {
  readonly productGrid: Locator;

  constructor(page: Page) {
    super(page);
    this.productGrid = page.locator('#tbodyid');
  }

  async open(): Promise<void> {
    await this.page.goto('/');
    await expect(this.productGrid.locator('.card').first()).toBeVisible();
  }

  productLink(product: Product): Locator {
    return this.productGrid.getByRole('link', { name: product.name, exact: true });
  }

  productCardPrice(product: Product): Locator {
    return this.productGrid
      .locator('.card')
      .filter({ has: this.productLink(product) })
      .locator('h5');
  }

  /**
   * Product images and the carousel can still be loading when the cards appear, shifting the
   * grid by a few pixels. A click that lands during that shift misses the link, so retry the
   * click until the product page actually opens.
   */
  async openProduct(product: Product): Promise<void> {
    const productUrl = new RegExp(`/prod\\.html\\?idp_=${product.id}(&|$)`);
    await expect(async () => {
      if (!productUrl.test(this.page.url())) {
        await this.productLink(product).click({ timeout: 5_000 });
      }
      await this.page.waitForURL(productUrl, { timeout: 5_000 });
    }).toPass({ timeout: 30_000 });
  }
}
