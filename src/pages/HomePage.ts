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

  async openProduct(product: Product): Promise<void> {
    await Promise.all([this.page.waitForURL(/\/prod\.html\?idp_=/), this.productLink(product).click()]);
  }
}
