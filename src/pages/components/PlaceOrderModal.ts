import { expect, type Locator, type Page } from '@playwright/test';
import type { CheckoutDetails } from '../../data/checkout';
import { acceptNextDialog } from '../../utils/dialogs';

export class PlaceOrderModal {
  readonly root: Locator;
  readonly totalLabel: Locator;
  readonly purchaseButton: Locator;
  readonly closeButton: Locator;
  private readonly fields: Record<keyof CheckoutDetails, Locator>;

  constructor(private readonly page: Page) {
    this.root = page.locator('#orderModal');
    this.totalLabel = this.root.locator('#totalm');
    this.purchaseButton = this.root.getByRole('button', { name: 'Purchase' });
    this.closeButton = this.root.locator('.modal-footer').getByRole('button', { name: 'Close' });
    this.fields = {
      name: this.root.locator('#name'),
      country: this.root.locator('#country'),
      city: this.root.locator('#city'),
      card: this.root.locator('#card'),
      month: this.root.locator('#month'),
      year: this.root.locator('#year'),
    };
  }

  field(name: keyof CheckoutDetails): Locator {
    return this.fields[name];
  }

  async expectOpenWithTotal(total: number): Promise<void> {
    await expect(this.root).toBeVisible();
    await expect(this.totalLabel).toHaveText(`Total: ${total}`);
  }

  /** Fills every field so no value is left over from a previous attempt. */
  async fill(details: CheckoutDetails): Promise<void> {
    await expect(this.fields.name).toBeVisible();
    for (const [key, locator] of Object.entries(this.fields) as [keyof CheckoutDetails, Locator][]) {
      await locator.fill(details[key]);
    }
  }

  async purchase(): Promise<void> {
    await this.purchaseButton.click();
  }

  async purchaseExpectingAlert(): Promise<string> {
    return acceptNextDialog(this.page, () => this.purchaseButton.click());
  }
}
