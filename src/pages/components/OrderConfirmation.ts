import { expect, type Locator, type Page } from '@playwright/test';
import { PURCHASE_CONFIRMATION_TITLE } from '../../constants/messages';

export interface OrderReceipt {
  id: string;
  amount: number;
  cardNumber: string;
  name: string;
  date: string;
}

/** The "Thank you for your purchase!" dialog (SweetAlert) shown after a purchase. */
export class OrderConfirmation {
  readonly root: Locator;
  readonly title: Locator;
  readonly details: Locator;
  readonly okButton: Locator;

  constructor(private readonly page: Page) {
    this.root = page.locator('.sweet-alert');
    this.title = this.root.locator('h2');
    this.details = this.root.locator('p').first();
    this.okButton = this.root.getByRole('button', { name: 'OK' });
  }

  /**
   * SweetAlert only wires up its buttons once the opening animation has finished and the
   * dialog has the `visible` class. Clicking OK earlier just closes the dialog without
   * running the "go to Home" callback, so always wait for this state first.
   */
  async waitUntilReady(): Promise<void> {
    await expect(this.title).toHaveText(PURCHASE_CONFIRMATION_TITLE);
    await expect(this.root).toHaveClass(/(^|\s)visible(\s|$)/);
  }

  async read(): Promise<OrderReceipt> {
    await this.waitUntilReady();
    const text = await this.details.innerText();
    const field = (label: string): string =>
      text.match(new RegExp(`${label}:[ \\t]*(.*)`))?.[1]?.trim() ?? '';
    return {
      id: field('Id'),
      amount: Number(field('Amount').replace(/\s*USD$/, '')),
      cardNumber: field('Card Number'),
      name: field('Name'),
      date: field('Date'),
    };
  }

  async confirm(): Promise<void> {
    await this.waitUntilReady();
    await Promise.all([this.page.waitForURL(/\/index\.html/), this.okButton.click()]);
  }
}
