import { expect, type Locator, type Page } from '@playwright/test';
import { acceptNextDialog } from '../../utils/dialogs';
import { fillAndVerify } from '../../utils/forms';

export class SignUpModal {
  readonly root: Locator;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;

  constructor(private readonly page: Page) {
    this.root = page.locator('#signInModal');
    this.usernameInput = this.root.locator('#sign-username');
    this.passwordInput = this.root.locator('#sign-password');
    this.submitButton = this.root.getByRole('button', { name: 'Sign up' });
  }

  /** Submits the form and returns the alert text. */
  async register(username: string, password: string): Promise<string> {
    await expect(this.usernameInput).toBeVisible();
    await fillAndVerify([
      [this.usernameInput, username],
      [this.passwordInput, password],
    ]);
    return acceptNextDialog(this.page, () => this.submitButton.click());
  }
}
