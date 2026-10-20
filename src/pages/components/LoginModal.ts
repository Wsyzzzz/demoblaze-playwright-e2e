import { expect, type Locator, type Page } from '@playwright/test';
import { acceptNextDialog } from '../../utils/dialogs';
import { fillAndVerify } from '../../utils/forms';

export class LoginModal {
  readonly root: Locator;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly closeButton: Locator;

  constructor(private readonly page: Page) {
    this.root = page.locator('#logInModal');
    this.usernameInput = this.root.locator('#loginusername');
    this.passwordInput = this.root.locator('#loginpassword');
    this.submitButton = this.root.getByRole('button', { name: 'Log in' });
    this.closeButton = this.root.locator('.modal-footer').getByRole('button', { name: 'Close' });
  }

  async close(): Promise<void> {
    await this.closeButton.click();
    await expect(this.root).toBeHidden();
  }

  async fill(username: string, password: string): Promise<void> {
    await expect(this.usernameInput).toBeVisible();
    await fillAndVerify([
      [this.usernameInput, username],
      [this.passwordInput, password],
    ]);
  }

  /** Successful login reloads the page; callers assert the logged-in state via NavBar. */
  async logIn(username: string, password: string): Promise<void> {
    await this.fill(username, password);
    await Promise.all([this.page.waitForEvent('load'), this.submitButton.click()]);
  }

  /** Submits and returns the alert text (used for negative cases). */
  async submitExpectingAlert(username: string, password: string): Promise<string> {
    await this.fill(username, password);
    return acceptNextDialog(this.page, () => this.submitButton.click());
  }
}
